import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { EMAIL_LOGO_SVG } from '@/lib/email-logo'
import { ownerFirstName } from '@/lib/nag-task'
import { getOrCreatePortalLink } from '@/lib/portal-access'

type DigestTask = {
  id: string
  title: string
  deadline: string | null
  nag_count: number
  done_token: string
  urgency: 'low' | 'medium' | 'high'
  scheduled_start_at: string | null
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function deadlineLabel(deadline: string | null): { text: string; overdue: boolean } | null {
  if (!deadline) return null
  const date = new Date(deadline)
  const overdue = date < new Date()
  const daysOverdue = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
  const formatted = date.toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return { text: overdue ? `${formatted} — ${daysOverdue}d overdue` : `Due ${formatted}`, overdue }
}

function buildTaskRow(task: DigestTask, appUrl: string | undefined): string {
  const deadline = deadlineLabel(task.deadline)
  const doneLink = `${appUrl}/done/${task.done_token}`
  return `
    <div style="padding:16px 0;border-top:1px solid #e5e7eb;">
      <p style="color:#111827;font-size:15px;font-weight:bold;margin:0 0 6px;">${escapeHtml(task.title)}</p>
      <p style="color:#6b7280;font-size:13px;margin:0 0 10px;">
        ${deadline ? `<span style="color:${deadline.overdue ? '#dc2626' : '#6b7280'};">${deadline.text}</span> · ` : ''}${task.nag_count === 0 ? 'Not yet reminded' : `Reminded ${task.nag_count} time${task.nag_count === 1 ? '' : 's'} before`}
      </p>
      <a href="${doneLink}" style="color:#22d45f;font-size:13px;font-weight:bold;text-decoration:none;">I've completed this →</a>
    </div>`
}

/**
 * Sends one recipient their daily digest — everything outstanding under a
 * single owner, in one email, instead of a separate nag per task. Every
 * task included counts as nagged (nag_count / last_nagged_at / nag_logs),
 * same as an individual nag would, so history and reliability scoring stay
 * accurate — digest mode changes delivery, not the underlying task state.
 */
export async function sendDailyDigest(recipient: {
  id: string
  owner_id: string
  email: string
}): Promise<{ sent: boolean; reason?: string; taskCount?: number }> {
  const now = Date.now()

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, deadline, nag_count, done_token, urgency, scheduled_start_at')
    .eq('owner_id', recipient.owner_id)
    .eq('recipient_email', recipient.email)
    .eq('status', 'active')

  const dueTasks = ((tasks ?? []) as DigestTask[]).filter(
    (t) => !t.scheduled_start_at || new Date(t.scheduled_start_at).getTime() <= now
  )

  if (dueTasks.length === 0) {
    return { sent: false, reason: 'no_tasks' }
  }

  dueTasks.sort((a, b) => {
    const urgencyDiff = (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2)
    if (urgencyDiff !== 0) return urgencyDiff
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(recipient.owner_id)
  const ownerEmail = ownerData.user?.email || ''
  const ownerName = ownerFirstName(ownerEmail)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const portalLink = await getOrCreatePortalLink({
    recipientId: recipient.id,
    ownerId: recipient.owner_id,
    email: recipient.email,
  })

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:0;}</style>
</head>
<body>
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#ffffff;padding:32px 40px;border-bottom:2px solid #22d45f;text-align:center;">${EMAIL_LOGO_SVG}</div>
  <div style="background:#ffffff;padding:36px 40px;">
    <p style="color:#111827;font-size:15px;line-height:1.7;margin:0 0 4px;">Your daily catch-up, on behalf of ${escapeHtml(ownerName)}:</p>
    <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">${dueTasks.length} outstanding task${dueTasks.length === 1 ? '' : 's'}</p>
    <a href="${portalLink}" style="display:inline-block;background:#22d45f;color:#000000;padding:12px 24px;text-decoration:none;font-weight:bold;font-size:14px;border-radius:6px;">Open your portal &rarr;</a>
    ${dueTasks.map((t) => buildTaskRow(t, appUrl)).join('')}
  </div>
  <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.6;">Sent by Arlo on behalf of ${escapeHtml(ownerName)}. You're on the daily summary — one email a day instead of one per task.</p>
  </div>
</div>
</body>
</html>`

  const { error: sendError } = await resend.emails.send({
    from: 'Arlo <arlo@agent-arlo.com>',
    to: recipient.email,
    subject: `Your Arlo summary — ${dueTasks.length} outstanding task${dueTasks.length === 1 ? '' : 's'}`,
    html,
  })

  if (sendError) {
    console.error('Failed to send daily digest', sendError)
    return { sent: false, reason: 'send_failed' }
  }

  const sentAt = new Date().toISOString()

  await Promise.all(
    dueTasks.map(async (task) => {
      await supabaseAdmin
        .from('tasks')
        .update({ nag_count: task.nag_count + 1, last_nagged_at: sentAt })
        .eq('id', task.id)

      await supabaseAdmin.from('nag_logs').insert({
        task_id: task.id,
        recipient_email: recipient.email,
        tone_used: 'digest',
        subject: `Included in daily summary (${dueTasks.length} tasks)`,
        body: `Sent as part of ${recipient.email}&rsquo;s daily digest rather than an individual reminder.`,
      })
    })
  )

  await supabaseAdmin
    .from('recipients')
    .update({ last_digest_sent_at: sentAt })
    .eq('id', recipient.id)

  return { sent: true, taskCount: dueTasks.length }
}
