import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'
import DashboardTabs from './dashboard-tabs'
import ThemeToggle from '@/app/components/theme-toggle'
import Logo from '@/app/components/logo'

type Recipient = {
  id: string
  email: string
  name: string | null
  reliability_score: number
  average_nags_to_complete: number
  tasks_completed: number
  total_nags: number
}

function scoreColor(score: number): string {
  if (score >= 8) return '#22d45f'
  if (score >= 5) return '#f59e0b'
  return '#ef4444'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: tasks }, { data: recipients }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false }),
    supabase
      .from('recipients')
      .select('*')
      .eq('owner_id', user.id)
      .order('reliability_score', { ascending: false }),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <Logo className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          <Link
            href="/contacts"
            className="text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Contacts
          </Link>
          <Link
            href="/transcripts"
            className="text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Transcripts
          </Link>
          <Link
            href="/transcripts/new"
            className="btn-green-outline px-3 py-1.5 text-sm font-semibold rounded-md"
          >
            New transcript
          </Link>
          <Link href="/tasks/new" className="btn-green px-3 py-1.5 text-sm font-semibold rounded-md">
            New task
          </Link>
          <Link
            href="/settings"
            className="text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={undefined}
          >
            Settings
          </Link>
          <ThemeToggle />
          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Tasks section */}
        <section>
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Your tasks
          </h1>
          <DashboardTabs tasks={tasks ?? []} />
        </section>

        {/* Reliability scores section */}
        <section>
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Reliability scores
          </h2>

          {!recipients || recipients.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
              Reliability scores will appear here once tasks are completed.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recipients.map((r: Recipient) => {
                const color = scoreColor(r.reliability_score)
                const pct = (r.reliability_score / 10) * 100
                return (
                  <div
                    key={r.id}
                    className="rounded-lg p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {r.name || r.email}
                        </p>
                        {r.name && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
                            {r.email}
                          </p>
                        )}
                      </div>
                      <span className="text-lg font-bold shrink-0" style={{ color }}>
                        {r.reliability_score.toFixed(1)}
                        <span className="text-sm font-normal" style={{ color: 'var(--text-faint)' }}>
                          /10
                        </span>
                      </span>
                    </div>

                    <div
                      className="rounded-full mb-3"
                      style={{ background: 'var(--border)', height: 6 }}
                    >
                      <div
                        className="rounded-full h-full transition-all"
                        style={{ background: color, width: `${pct}%` }}
                      />
                    </div>

                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {r.tasks_completed} task{r.tasks_completed === 1 ? '' : 's'} completed
                      {r.tasks_completed > 0 && (
                        <> · nagged {r.average_nags_to_complete.toFixed(1)}x on average</>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
