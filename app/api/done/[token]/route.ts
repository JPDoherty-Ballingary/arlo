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
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;">
          <div style="padding:32px 40px;border-bottom:2px solid #22d45f;text-align:center;">${EMAIL_LOGO_SVG}</div>
          <div style="padding:36px 40px;">
            <p style="color:#111827;font-size:15px;line-height:1.7;margin:0 0 12px;">Hey ${firstName},</p>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;"><strong style="color:#111827;">${recipientName}</strong> is claiming that <strong style="color:#111827;">&ldquo;${task.title}&rdquo;</strong> is done.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#22d45f;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:6px;">Go to dashboard →</a>
          </div>
          <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;"><p style="color:#9ca3af;font-size:11px;margin:0;">Sent by ARLO.</p></div>
        </div>
      </body></html>`,
    })
  }

  return NextResponse.json({ ok: true })
}
