import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'
import TaskCard from './task-card'

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
    <div className="min-h-screen text-white" style={{ background: '#0a0a0a' }}>
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
      >
        <span
          className="font-bold text-lg"
          style={{ color: '#22d45f', letterSpacing: '-0.02em' }}
        >
          ARLO
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/transcripts/new"
            className="text-sm transition-colors hover:text-white"
            style={{ color: '#888888' }}
          >
            Parse transcript
          </Link>
          <span className="text-sm" style={{ color: '#888888' }}>
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Tasks section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Your tasks</h1>
            <Link href="/tasks/new" className="btn-green px-4 py-2 text-sm font-semibold rounded-md">
              New task
            </Link>
          </div>

          {!tasks || tasks.length === 0 ? (
            <div className="card-task rounded-lg p-8 text-center">
              <p style={{ color: '#888888' }}>No active tasks. Add one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>

        {/* Reliability scores section */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">Reliability scores</h2>

          {!recipients || recipients.length === 0 ? (
            <p className="text-sm" style={{ color: '#555' }}>
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
                    style={{ background: '#111111', border: '1px solid #1a1a1a' }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {r.name || r.email}
                        </p>
                        {r.name && (
                          <p className="text-xs truncate" style={{ color: '#555' }}>
                            {r.email}
                          </p>
                        )}
                      </div>
                      <span className="text-lg font-bold shrink-0" style={{ color }}>
                        {r.reliability_score.toFixed(1)}
                        <span className="text-sm font-normal" style={{ color: '#555' }}>
                          /10
                        </span>
                      </span>
                    </div>

                    {/* Score bar */}
                    <div
                      className="rounded-full mb-3"
                      style={{ background: '#1a1a1a', height: 6 }}
                    >
                      <div
                        className="rounded-full h-full transition-all"
                        style={{ background: color, width: `${pct}%` }}
                      />
                    </div>

                    <p className="text-xs" style={{ color: '#555' }}>
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
