import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { EMAIL_LOGO_SVG } from '@/lib/email-logo'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const email = (body.email as string)?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const { data: recipient } = await supabaseAdmin
    .from('recipients')
    .select('id, owner_id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (!recipient) {
    return NextResponse.json(
      {
        error:
          "No account found for that email. If you've been assigned tasks through Arlo, check you're using the correct email address.",
      },
      { status: 404 }
    )
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await supabaseAdmin.from('recipient_sessions').insert({
    email,
    recipient_id: recipient.id,
    owner_id: recipient.owner_id,
    token,
    expires_at: expiresAt,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const portalLink = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`

  await resend.emails.send({
    from: 'Arlo <arlo@agent-arlo.com>',
    to: email,
    subject: 'Your Arlo portal access link',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:0;}</style>
</head>
<body>
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#ffffff;padding:32px 40px;border-bottom:2px solid #22d45f;text-align:center;">${EMAIL_LOGO_SVG}</div>
  <div style="background:#ffffff;padding:36px 40px;">
    <h1 style="color:#111827;font-size:20px;font-weight:bold;margin:0 0 16px;">Your Arlo portal access link</h1>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 28px;">Click below to access your Arlo task portal. This link expires in 7 days.</p>
    <a href="${portalLink}" style="display:inline-block;background:#22d45f;color:#000000;padding:14px 28px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:6px;">Access my portal &rarr;</a>
  </div>
  <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.6;">Sent by Arlo. If you didn't request this, you can ignore it.</p>
  </div>
</div>
</body>
</html>`,
  })

  return NextResponse.json({ ok: true })
}
