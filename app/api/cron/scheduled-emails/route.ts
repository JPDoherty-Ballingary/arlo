import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { EMAIL_LOGO_SVG } from '@/lib/email-logo'
import { NextResponse } from 'next/server'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Agenda reminder helpers ────────────────────────────────────────────────────

type TaskRow = {
  id: string
  title: string
  deadline: string | null
  urgency: 'high' | 'medium' | 'low'
  recipient_name: string | null
  recipient_email: string
  nag_count: number
}

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function sortByUrgency(tasks: TaskRow[]): TaskRow[] {
  return [...tasks].sort((a, b) => {
    const diff = (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2)
    if (diff !== 0) return diff
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
}

function daysOverdue(deadline: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(deadline).getTime()) / 86400000))
}

function taskRowHtml(task: TaskRow, now: Date): string {
  const overdue = task.deadline && new Date(task.deadline) < now ? daysOverdue(task.deadline, now) : 0
  const borderColor = task.urgency === 'high' ? '#ef4444' : task.urgency === 'medium' ? '#f59e0b' : '#e5e7eb'
  const recipient = escapeHtml(task.recipient_name || task.recipient_email)
  const nagText = task.nag_count === 0 ? 'not yet nagged' : `nagged ${task.nag_count}&times;`
  const overdueHtml = overdue > 0
    ? ` &mdash; <span style="color:#ef4444;font-weight:600;">${overdue}d overdue</span>`
    : ''
  return `<div style="padding:10px 12px;margin:0 0 6px;border-radius:4px;border-left:3px solid ${borderColor};background:#f9fafb;">
  <div style="color:#111827;font-size:14px;font-weight:500;">${escapeHtml(task.title)}${overdueHtml}</div>
  <div style="color:#6b7280;font-size:12px;margin-top:3px;">${recipient} &middot; ${nagText}</div>
</div>`
}

function sectionHtml(heading: string, items: string[]): string {
  return `<div>
  <h3 style="color:#111827;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">${escapeHtml(heading)}</h3>
  ${items.join('')}
</div>`
}

function agendaReminderEmail({
  meetingTitle,
  meetingTimeLabel,
  bodyHtml,
  agendaUrl,
}: {
  meetingTitle: string
  meetingTimeLabel: string
  bodyHtml: string
  agendaUrl: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:0;}</style>
</head>
<body>
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#ffffff;padding:32px 40px;border-bottom:2px solid #22d45f;text-align:center;">${EMAIL_LOGO_SVG}</div>
  <div style="background:#ffffff;padding:36px 40px;">
    <h1 style="color:#111827;font-size:22px;font-weight:bold;margin:0 0 4px;">${escapeHtml(meetingTitle)}</h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">${escapeHtml(meetingTimeLabel)}</p>
    ${bodyHtml}
    <div style="margin-top:32px;">
      <a href="${agendaUrl}" style="display:inline-block;background:#22d45f;color:#000000;padding:12px 24px;text-decoration:none;font-weight:bold;font-size:14px;border-radius:6px;">View full agenda &rarr;</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.6;">Sent by Arlo. Internal summary — not shared with recipients.</p>
  </div>
</div>
</body>
</html>`
}

function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Cron handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Scheduled emails (existing logic, unchanged) ───────────────────────────

  const { data: due, error } = await supabaseAdmin
    .from('scheduled_emails')
    .select('*')
    .lte('send_at', new Date().toISOString())
    .eq('sent', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; status: string; error?: string }[] = []

  for (const row of due ?? []) {
    try {
      await resend.emails.send({
        from: 'ARLO <arlo@agent-arlo.com>',
        to: row.to_email,
        replyTo: row.reply_to ?? undefined,
        subject: row.subject,
        html: row.html,
      })

      const sentAt = new Date().toISOString()

      await supabaseAdmin
        .from('scheduled_emails')
        .update({ sent: true, sent_at: sentAt })
        .eq('id', row.id)

      if (row.recipient_id) {
        await supabaseAdmin
          .from('recipients')
          .update({ intro_email_sent: true, intro_email_sent_at: sentAt })
          .eq('id', row.recipient_id)
      }

      results.push({ id: row.id, status: 'sent' })
    } catch (err) {
      results.push({ id: row.id, status: 'error', error: String(err) })
    }
  }

  // ── Agenda reminders ───────────────────────────────────────────────────────

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const agendaUrl = `${appUrl}/agenda`
  const now = new Date()
  const plus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const plus2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const agendaResults: { id: string; type: string; status: string; error?: string }[] = []

  // Fetch both windows in parallel
  const [{ data: agendas24h }, { data: agendas2h }] = await Promise.all([
    supabaseAdmin
      .from('agendas')
      .select('id, title, meeting_date, owner_id')
      .eq('reminder_24h_sent', false)
      .gte('meeting_date', now.toISOString())
      .lte('meeting_date', plus24h.toISOString()),
    supabaseAdmin
      .from('agendas')
      .select('id, title, meeting_date, owner_id')
      .eq('reminder_2h_sent', false)
      .gte('meeting_date', now.toISOString())
      .lte('meeting_date', plus2h.toISOString()),
  ])

  // Process 24h reminders
  for (const agenda of agendas24h ?? []) {
    try {
      const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(agenda.owner_id)
      const ownerEmail = ownerData.user?.email
      if (!ownerEmail) continue

      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('id, title, deadline, urgency, recipient_name, recipient_email, nag_count')
        .eq('owner_id', agenda.owner_id)
        .eq('status', 'active')

      if (!tasks || tasks.length === 0) continue

      const sorted = sortByUrgency(tasks as TaskRow[])
      const overdue = sorted.filter((t) => t.deadline && new Date(t.deadline) < now)
      const outstanding = sorted

      const bodyHtml = [
        overdue.length > 0
          ? sectionHtml('Overdue items', overdue.map((t) => taskRowHtml(t, now)))
          : '',
        sectionHtml('Outstanding items', outstanding.map((t) => taskRowHtml(t, now))),
      ].join('')

      const html = agendaReminderEmail({
        meetingTitle: agenda.title,
        meetingTimeLabel: formatMeetingTime(agenda.meeting_date),
        bodyHtml,
        agendaUrl,
      })

      await resend.emails.send({
        from: 'Arlo <arlo@agent-arlo.com>',
        to: ownerEmail,
        subject: `Arlo: tomorrow's meeting — ${agenda.title}`,
        html,
      })

      await supabaseAdmin
        .from('agendas')
        .update({ reminder_24h_sent: true })
        .eq('id', agenda.id)

      agendaResults.push({ id: agenda.id, type: '24h', status: 'sent' })
    } catch (err) {
      agendaResults.push({ id: agenda.id, type: '24h', status: 'error', error: String(err) })
    }
  }

  // Process 2h reminders
  for (const agenda of agendas2h ?? []) {
    try {
      const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(agenda.owner_id)
      const ownerEmail = ownerData.user?.email
      if (!ownerEmail) continue

      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('id, title, deadline, urgency, recipient_name, recipient_email, nag_count')
        .eq('owner_id', agenda.owner_id)
        .eq('status', 'active')

      if (!tasks || tasks.length === 0) continue

      const top5 = sortByUrgency(tasks as TaskRow[]).slice(0, 5)

      const bodyHtml = sectionHtml(
        'Top items to discuss',
        top5.map((t) => taskRowHtml(t, now))
      )

      const html = agendaReminderEmail({
        meetingTitle: agenda.title,
        meetingTimeLabel: formatMeetingTime(agenda.meeting_date),
        bodyHtml,
        agendaUrl,
      })

      await resend.emails.send({
        from: 'Arlo <arlo@agent-arlo.com>',
        to: ownerEmail,
        subject: `Arlo: your meeting starts in 2 hours — ${agenda.title}`,
        html,
      })

      await supabaseAdmin
        .from('agendas')
        .update({ reminder_2h_sent: true })
        .eq('id', agenda.id)

      agendaResults.push({ id: agenda.id, type: '2h', status: 'sent' })
    } catch (err) {
      agendaResults.push({ id: agenda.id, type: '2h', status: 'error', error: String(err) })
    }
  }

  return NextResponse.json({
    sent: results.filter((r) => r.status === 'sent').length,
    results,
    agendaReminders: agendaResults,
  })
}
