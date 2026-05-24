import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { resend } from '@/lib/resend'
import { EMAIL_LOGO_SVG } from '@/lib/email-logo'

const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #0a0a0a; padding: 24px 32px; border-bottom: 2px solid #22d45f; }
    .header p { color: #888; margin: 4px 0 0; font-size: 12px; }
    .body { background: #111111; padding: 32px; }
    .task-title { color: #ffffff; font-size: 20px; font-weight: bold; margin: 0 0 16px; }
    .body-text { color: #cccccc; line-height: 1.6; white-space: pre-wrap; }
    .buttons { margin: 32px 0 0; display: flex; gap: 12px; flex-direction: column; }
    .btn-done { display: inline-block; background: #22d45f; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; }
    .footer { background: #0a0a0a; padding: 20px 32px; border-top: 1px solid #1a1a1a; }
    .footer p { color: #555; font-size: 11px; margin: 0; line-height: 1.6; }
    .unsubscribe { color: #555; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${EMAIL_LOGO_SVG}
    </div>
    <div class="body">
      <p class="task-title">{{TASK_TITLE}}</p>
      <p class="body-text">{{BODY}}</p>
      <div class="buttons">
        <a href="{{DONE_LINK}}" class="btn-done">I've completed this →</a>
      </div>
    </div>
    <div class="footer">
      <p>This reminder was sent by ARLO on behalf of {{OWNER_NAME}}.</p>
      <p style="margin-top: 8px;"><a href="{{UNSUBSCRIBE_LINK}}" class="unsubscribe">Unsubscribe from these reminders</a></p>
    </div>
  </div>
</body>
</html>`

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildEmail(params: {
  taskTitle: string
  body: string
  doneLink: string
  unsubscribeLink: string
  ownerName: string
}): string {
  return EMAIL_TEMPLATE
    .replace('{{TASK_TITLE}}', escapeHtml(params.taskTitle))
    .replace('{{BODY}}', escapeHtml(params.body))
    .replace('{{DONE_LINK}}', params.doneLink)
    .replace('{{UNSUBSCRIBE_LINK}}', params.unsubscribeLink)
    .replace('{{OWNER_NAME}}', escapeHtml(params.ownerName))
}

function ownerFirstName(email: string): string {
  const local = email.split('@')[0]
  const part = local.split(/[._]/)[0].replace(/\d+/g, '')
  return part.charAt(0).toUpperCase() + part.slice(1) || 'there'
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: allActiveTasks, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('status', 'active')

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  const now = Date.now()
  const dueTasks = (allActiveTasks || []).filter((task) => {
    if (task.scheduled_start_at && new Date(task.scheduled_start_at).getTime() > now) return false
    if (!task.last_nagged_at) return true
    const nextNagAt =
      new Date(task.last_nagged_at).getTime() + task.frequency_hours * 3600 * 1000
    return now >= nextNagAt
  })

  const results: unknown[] = []

  for (const task of dueTasks) {
    try {
      // Abuse limit: max 3 nag emails per recipient per day per owner
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: ownerTaskIds } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('owner_id', task.owner_id)
        .eq('recipient_email', task.recipient_email)

      const taskIds = (ownerTaskIds || []).map((t: { id: string }) => t.id)

      if (taskIds.length > 0) {
        const { count: nagsToday } = await supabaseAdmin
          .from('nag_logs')
          .select('*', { count: 'exact', head: true })
          .in('task_id', taskIds)
          .gte('sent_at', todayStart.toISOString())

        if ((nagsToday || 0) >= 3) {
          results.push({ taskId: task.id, skipped: 'abuse_limit' })
          continue
        }
      }

      // Fetch owner email
      const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(
        task.owner_id
      )
      const ownerEmail = ownerData.user?.email || ''
      const firstName = ownerFirstName(ownerEmail)

      // Fetch recipient reliability score
      const { data: recipient } = await supabaseAdmin
        .from('recipients')
        .select('reliability_score, average_nags_to_complete')
        .eq('owner_id', task.owner_id)
        .eq('email', task.recipient_email)
        .single()

      const reliabilityScore = recipient?.reliability_score ?? 5.0

      // Fetch last tone used
      const { data: lastNag } = await supabaseAdmin
        .from('nag_logs')
        .select('tone_used')
        .eq('task_id', task.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      const lastTone = lastNag?.tone_used || 'none yet'

      const daysOverdue = task.deadline
        ? Math.max(
            0,
            Math.floor(
              (now - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : 0

      // Call Anthropic
      const aiResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are ARLO, a professional AI agent managing task accountability on behalf of someone. You are persistent, impossible to ignore, but always professional. Never rude. Never aggressive. Just relentless.

Given this task and its history, decide what to do and write the email if needed.

Task: ${task.title}
Context: ${task.context || 'No additional context'}
Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline set'}
Days overdue: ${daysOverdue > 0 ? daysOverdue : 'Not overdue'}
Nags sent so far: ${task.nag_count}
Last tone used: ${lastTone}
Recipient name: ${task.recipient_name || task.recipient_email}
Recipient reliability score: ${reliabilityScore}/10
Owner first name: ${firstName}

Tone guidance:
- Nags 1-2: friendly and light
- Nags 3-4: firm and clear
- Nags 5-7: direct, no fluff
- Nags 8+: urgent, make clear this is unacceptable
- 15+ nags with no completion: do not email, notify the owner instead

Respond ONLY in this exact JSON format with no other text:
{
  "action": "send_nag" or "send_escalation" or "notify_owner" or "pause",
  "tone": "friendly" or "firm" or "direct" or "urgent",
  "subject": "email subject line or null",
  "body": "full plain text email body or null. Include {{DONE_LINK}} where the completion link should go and {{UNSUBSCRIBE_LINK}} where the unsubscribe link should go.",
  "reason": "one sentence explaining your decision"
}`,
          },
        ],
      })

      const aiText =
        aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

      let decision: {
        action: string
        tone: string
        subject: string | null
        body: string | null
        reason: string
      }

      try {
        const cleaned = aiText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim()
        decision = JSON.parse(cleaned)
      } catch {
        const match = aiText.match(/\{[\s\S]*\}/)
        if (!match) throw new Error(`Could not parse AI response: ${aiText.slice(0, 200)}`)
        decision = JSON.parse(match[0])
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      const doneLink = `${appUrl}/done/${task.done_token}`
      const unsubscribeLink = `${appUrl}/unsubscribe/${task.done_token}`

      if (decision.action === 'send_nag' || decision.action === 'send_escalation') {
        const emailBody = (decision.body || '')
          .replace('{{DONE_LINK}}', doneLink)
          .replace('{{UNSUBSCRIBE_LINK}}', unsubscribeLink)

        const html = buildEmail({
          taskTitle: task.title,
          body: emailBody,
          doneLink,
          unsubscribeLink,
          ownerName: firstName,
        })

        await resend.emails.send({
          from: 'Arlo <arlo@agent-arlo.com>',
          to: task.recipient_email,
          subject: decision.subject || `Action required: ${task.title}`,
          html,
        })

        await supabaseAdmin
          .from('tasks')
          .update({
            nag_count: task.nag_count + 1,
            last_nagged_at: new Date().toISOString(),
          })
          .eq('id', task.id)

        await supabaseAdmin.from('nag_logs').insert({
          task_id: task.id,
          recipient_email: task.recipient_email,
          tone_used: decision.tone,
          subject: decision.subject,
          body: emailBody,
        })

        results.push({ taskId: task.id, action: decision.action, tone: decision.tone })
      } else if (decision.action === 'notify_owner') {
        await resend.emails.send({
          from: 'Arlo <arlo@agent-arlo.com>',
          to: ownerEmail,
          subject: `Arlo: Intervention needed — "${task.title}"`,
          html: `<div style="font-family:sans-serif;background:#0a0a0a;color:#ccc;max-width:600px;margin:0 auto;">
            <div style="padding:24px 32px;border-bottom:2px solid #22d45f;">${EMAIL_LOGO_SVG}</div>
            <div style="background:#111;padding:32px;">
              <p>ARLO has attempted to reach <strong>${escapeHtml(task.recipient_name || task.recipient_email)}</strong> ${task.nag_count} time${task.nag_count === 1 ? '' : 's'} regarding <strong>"${escapeHtml(task.title)}"</strong> with no response.</p>
              <p>You may need to intervene directly.</p>
            </div>
          </div>`,
        })

        await supabaseAdmin
          .from('tasks')
          .update({ status: 'paused' })
          .eq('id', task.id)

        results.push({ taskId: task.id, action: 'notify_owner', reason: decision.reason })
      } else if (decision.action === 'pause') {
        await supabaseAdmin
          .from('tasks')
          .update({ status: 'paused' })
          .eq('id', task.id)

        results.push({ taskId: task.id, action: 'paused', reason: decision.reason })
      }
    } catch (err) {
      results.push({ taskId: task.id, error: String(err) })
    }
  }

  return NextResponse.json({
    total_active: allActiveTasks?.length ?? 0,
    due: dueTasks.length,
    results,
  })
}
