import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { EMAIL_LOGO_SVG } from '@/lib/email-logo'
import { NextResponse } from 'next/server'

function ownerFirstName(email: string): string {
  const local = email.split('@')[0]
  const part = local.split(/[._]/)[0].replace(/\d+/g, '')
  return part.charAt(0).toUpperCase() + part.slice(1) || 'there'
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('done_token', token)
    .single()

  if (!task) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (task.owner_notified_of_claim) {
    return NextResponse.json({ ok: true, alreadyNotified: true })
  }

  await supabaseAdmin
    .from('tasks')
    .update({ owner_notified_of_claim: true })
    .eq('id', task.id)

  const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(task.owner_id)
  const ownerEmail = ownerData.user?.email || ''
  const firstName = ownerFirstName(ownerEmail)
  const recipientName = task.recipient_name || task.recipient_email

  if (ownerEmail) {
    await resend.emails.send({
      from: 'ARLO <arlo@agent-arlo.com>',
      to: ownerEmail,
      subject: `ARLO: ${recipientName} is claiming "${task.title}" is done`,
      html: `<div style="font-family:sans-serif;background:#0a0a0a;color:#ccc;max-width:600px;margin:0 auto;">
        <div style="padding:24px 32px;border-bottom:2px solid #22d45f;">${EMAIL_LOGO_SVG}</div>
        <div style="background:#111;padding:32px;">
          <p>Hey ${firstName},</p>
          <p><strong style="color:#fff;">${recipientName}</strong> is claiming that <strong style="color:#fff;">"${task.title}"</strong> is done.</p>
          <p>Go to your ARLO dashboard to confirm and close out this task.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;margin-top:16px;background:#22d45f;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;">
            Go to dashboard →
          </a>
        </div>
      </div>`,
    })
  }

  return NextResponse.json({ ok: true })
}
