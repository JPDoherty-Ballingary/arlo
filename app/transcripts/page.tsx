import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/app-nav'

export const metadata: Metadata = { title: 'Transcripts' }

type Transcript = {
  id: string
  title: string | null
  created_at: string
  parsed_tasks: unknown[]
  tasks_saved_at: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function TranscriptsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('id, title, created_at, parsed_tasks, tasks_saved_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (transcripts ?? []) as Transcript[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          Transcripts
        </h1>

        {rows.length === 0 ? (
          <div
            className="rounded-lg p-10 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
              No transcripts yet.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
              <Link href="/transcripts/new" className="hover:underline" style={{ color: '#22d45f' }}>
                Paste a transcript manually
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((t) => {
              const taskCount = Array.isArray(t.parsed_tasks) ? t.parsed_tasks.length : 0
              const saved = !!t.tasks_saved_at

              return (
                <div
                  key={t.id}
                  className="rounded-lg p-4 flex items-center justify-between gap-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {t.title || 'Untitled meeting'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        {formatDate(t.created_at)}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: 'var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {taskCount} task{taskCount === 1 ? '' : 's'}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={
                          saved
                            ? { background: '#052e16', color: '#22d45f' }
                            : { background: '#451a03', color: '#f59e0b' }
                        }
                      >
                        {saved ? 'Saved' : 'Pending review'}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/transcripts/${t.id}`}
                    className="btn-green-outline px-3 py-1.5 text-sm font-semibold rounded-md shrink-0"
                  >
                    Review →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
