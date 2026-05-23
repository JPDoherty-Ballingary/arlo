import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'

function ownerFirstName(email: string): string {
  const local = email.split('@')[0]
  const part = local.split(/[._]/)[0].replace(/\d+/g, '')
  return part.charAt(0).toUpperCase() + part.slice(1) || 'there'
}

export default async function DonePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('done_token', token)
    .single()

  if (!task) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: '#0a0a0a' }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Link not found</h1>
          <p style={{ color: '#888888' }}>This link is no longer valid.</p>
        </div>
      </main>
    )
  }

  const recipientName = task.recipient_name || task.recipient_email

  // Fetch owner email
  const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(task.owner_id)
  const ownerEmail = ownerData.user?.email || ''
  const firstName = ownerFirstName(ownerEmail)

  // Only notify once
  if (!task.owner_notified_of_claim) {
    await supabaseAdmin
      .from('tasks')
      .update({ owner_notified_of_claim: true })
      .eq('id', task.id)

    if (ownerEmail) {
      await resend.emails.send({
        from: 'Arlo <onboarding@resend.dev>',
        to: ownerEmail,
        subject: `Arlo: ${recipientName} is claiming "${task.title}" is done`,
        html: `<div style="font-family:sans-serif;background:#111;color:#ccc;padding:32px;max-width:600px;margin:0 auto;">
          <h2 style="color:#22d45f;letter-spacing:2px;">ARLO</h2>
          <p><strong style="color:#fff;">${recipientName}</strong> is claiming that <strong style="color:#fff;">"${task.title}"</strong> is done.</p>
          <p>Go to your Arlo dashboard to confirm and close out this task.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;margin-top:16px;background:#22d45f;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;">
            Go to dashboard →
          </a>
        </div>`,
      })
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0a0a0a' }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="text-2xl font-bold mb-8"
          style={{ color: '#22d45f', letterSpacing: '2px' }}
        >
          ARLO
        </div>

        <div
          className="rounded-lg p-8"
          style={{ background: '#111111', border: '1px solid #1a1a1a' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ background: '#052e16', border: '1px solid #22d45f' }}
          >
            ✓
          </div>
          <h1 className="text-xl font-bold text-white mb-3">
            Thanks, {recipientName.split(' ')[0]}
          </h1>
          <p style={{ color: '#888888', lineHeight: 1.6 }}>
            We&apos;ve let <strong style={{ color: '#fff' }}>{firstName}</strong> know.
            They&apos;ll confirm it&apos;s done on their end.
          </p>
          <p className="mt-3 text-sm" style={{ color: '#555' }}>
            Arlo will keep following up until they do.
          </p>
        </div>
      </div>
    </main>
  )
}
