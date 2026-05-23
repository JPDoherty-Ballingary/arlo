import { supabaseAdmin } from '@/lib/supabase/admin'

function ownerFirstName(email: string): string {
  const local = email.split('@')[0]
  const part = local.split(/[._]/)[0].replace(/\d+/g, '')
  return part.charAt(0).toUpperCase() + part.slice(1) || 'there'
}

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('recipient_email, owner_id')
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
          <p style={{ color: '#888888' }}>This unsubscribe link is no longer valid.</p>
        </div>
      </main>
    )
  }

  // Fetch owner email for the confirmation message
  const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(task.owner_id)
  const ownerEmail = ownerData.user?.email || ''
  const firstName = ownerFirstName(ownerEmail)

  // Pause all active tasks from this owner to this recipient
  await supabaseAdmin
    .from('tasks')
    .update({ status: 'paused' })
    .eq('owner_id', task.owner_id)
    .eq('recipient_email', task.recipient_email)
    .eq('status', 'active')

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
          <h1 className="text-xl font-bold text-white mb-3">You&apos;re unsubscribed</h1>
          <p style={{ color: '#888888', lineHeight: 1.6 }}>
            You&apos;ve been unsubscribed from all reminders from{' '}
            <strong style={{ color: '#fff' }}>{firstName}</strong>. No further emails will be
            sent.
          </p>
        </div>
      </div>
    </main>
  )
}
