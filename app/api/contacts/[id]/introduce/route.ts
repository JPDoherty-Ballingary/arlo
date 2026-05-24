import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'

const INTRO_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;margin:0;padding:0}
    .container{max-width:600px;margin:0 auto}
    .header{background:#0a0a0a;padding:24px 32px;border-bottom:2px solid #22d45f}
    .header h1{color:#22d45f;margin:0;font-size:24px;letter-spacing:2px}
    .body{background:#111111;padding:32px}
    .body-text{color:#cccccc;line-height:1.8;font-size:15px;white-space:pre-wrap}
    .footer{background:#0a0a0a;padding:20px 32px;border-top:1px solid #1a1a1a}
    .footer p{color:#555;font-size:11px;margin:0}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>ARLO</h1></div>
    <div class="body"><p class="body-text">{{BODY}}</p></div>
    <div class="footer"><p>Sent by ARLO on behalf of {{OWNER_NAME}}.</p></div>
  </div>
</body>
</html>`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildHtml(body: string, ownerName: string): string {
  return INTRO_TEMPLATE.replace('{{BODY}}', escapeHtml(body)).replace(
    '{{OWNER_NAME}}',
    escapeHtml(ownerName)
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contact } = await supabase
    .from('recipients')
    .select('id, email, name')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const ownerName = profile?.display_name || user.email || 'Your contact'

  const body = await request.json()
  const { subject, body: emailBody, sendAt } = body

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  const html = buildHtml(emailBody, ownerName)
  const scheduledTime = sendAt ? new Date(sendAt) : null
  const isFuture = scheduledTime && scheduledTime > new Date()

  if (isFuture) {
    await supabaseAdmin.from('scheduled_emails').insert({
      owner_id: user.id,
      recipient_id: contact.id,
      to_email: contact.email,
      reply_to: user.email,
      subject,
      html,
      send_at: scheduledTime.toISOString(),
    })

    await supabaseAdmin
      .from('recipients')
      .update({ intro_email_scheduled_at: scheduledTime.toISOString() })
      .eq('id', contact.id)

    return NextResponse.json({ scheduled: true, send_at: scheduledTime.toISOString() })
  }

  await resend.emails.send({
    from: 'ARLO <arlo@agent-arlo.com>',
    to: contact.email,
    replyTo: user.email ?? undefined,
    subject,
    html,
  })

  const sentAt = new Date().toISOString()
  await supabaseAdmin
    .from('recipients')
    .update({ intro_email_sent: true, intro_email_sent_at: sentAt })
    .eq('id', contact.id)

  return NextResponse.json({ sent: true, sent_at: sentAt })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contact } = await supabase
    .from('recipients')
    .select('id, email, name')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const ownerName = profile?.display_name || user.email || 'Your contact'

  const reqBody = await request.json()
  const { subject, body: emailBody, sendAt } = reqBody

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  const html = buildHtml(emailBody, ownerName)
  const scheduledTime = sendAt ? new Date(sendAt) : null
  const isFuture = scheduledTime && scheduledTime > new Date()

  const { data: existing } = await supabaseAdmin
    .from('scheduled_emails')
    .select('id')
    .eq('recipient_id', id)
    .eq('sent', false)
    .limit(1)
    .maybeSingle()

  if (isFuture) {
    if (existing) {
      await supabaseAdmin
        .from('scheduled_emails')
        .update({ subject, html, send_at: scheduledTime.toISOString() })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin.from('scheduled_emails').insert({
        owner_id: user.id,
        recipient_id: contact.id,
        to_email: contact.email,
        reply_to: user.email,
        subject,
        html,
        send_at: scheduledTime.toISOString(),
      })
    }
    await supabaseAdmin
      .from('recipients')
      .update({ intro_email_scheduled_at: scheduledTime.toISOString() })
      .eq('id', contact.id)
    return NextResponse.json({ scheduled: true, send_at: scheduledTime.toISOString() })
  }

  // Send now — delete the pending scheduled row, send immediately
  if (existing) {
    await supabaseAdmin.from('scheduled_emails').delete().eq('id', existing.id)
  }

  await resend.emails.send({
    from: 'ARLO <arlo@agent-arlo.com>',
    to: contact.email,
    replyTo: user.email ?? undefined,
    subject,
    html,
  })

  const sentAt = new Date().toISOString()
  await supabaseAdmin
    .from('recipients')
    .update({ intro_email_sent: true, intro_email_sent_at: sentAt, intro_email_scheduled_at: null })
    .eq('id', contact.id)

  return NextResponse.json({ sent: true, sent_at: sentAt })
}
