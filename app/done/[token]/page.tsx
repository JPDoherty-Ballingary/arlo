import { supabaseAdmin } from '@/lib/supabase/admin'
import Logo from '@/app/components/logo'
import ClaimButton from './claim-button'

export default async function DonePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, title, recipient_name, recipient_email, status, owner_notified_of_claim')
    .eq('done_token', token)
    .single()

  if (!task) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Link not found
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>This link is no longer valid.</p>
        </div>
      </main>
    )
  }

  const recipientName = task.recipient_name || task.recipient_email

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md text-center">
        <Logo className="h-8 w-auto mx-auto mb-8" />

        <div
          className="rounded-lg p-8 flex flex-col gap-5 items-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Hey {recipientName.split(' ')[0]} 👋
          </h1>

          {task.owner_notified_of_claim ? (
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              We&apos;ve already let them know — they&apos;ll confirm this task on their end.
            </p>
          ) : (
            <ClaimButton token={token} taskTitle={task.title} />
          )}
        </div>
      </div>
    </main>
  )
}
