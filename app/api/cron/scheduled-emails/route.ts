import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: due, error } = await supabaseAdmin
    .from('scheduled_emails')
    .select('*')
    .lte('send_at', new Date().toISOString())
    .eq('sent', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!due || due.length === 0) return NextResponse.json({ sent: 0 })

  const results: { id: string; status: string; error?: string }[] = []

  for (const row of due) {
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

  return NextResponse.json({
    sent: results.filter((r) => r.status === 'sent').length,
    results,
  })
}
