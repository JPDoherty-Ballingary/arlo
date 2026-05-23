import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/app/components/theme-toggle'
import TaskActions from './task-actions'
import NagLogEntry from './nag-log-entry'

const URGENCY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDeadline(iso: string | null): { text: string; overdue: boolean } | null {
  if (!iso) return null
  const date = new Date(iso)
  const now = new Date()
  const overdue = date < now
  const text = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return { text, overdue }
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (taskError || !task) redirect('/dashboard')

  const [{ data: nagLogs }, { data: recipient }] = await Promise.all([
    supabase
      .from('nag_logs')
      .select('id, created_at, tone_used, subject, body')
      .eq('task_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('recipients')
      .select('reliability_score, tasks_completed')
      .eq('owner_id', user.id)
      .eq('email', task.recipient_email)
      .maybeSingle(),
  ])

  const deadline = formatDeadline(task.deadline)

  const STATUS_LABEL: Record<string, string> = {
    active: 'Active',
    paused: 'Paused',
    done: 'Done',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/dashboard" className="font-bold text-lg" style={{ color: '#22d45f', letterSpacing: '-0.02em' }}>
          ARLO
        </Link>
        <ThemeToggle />
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        {/* Task header */}
        <div
          className="rounded-lg p-6 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {task.title}
            </h1>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
              style={{
                background: `var(--badge-${task.urgency}-bg)`,
                color: `var(--badge-${task.urgency}-color)`,
              }}
            >
              {URGENCY_LABEL[task.urgency]}
            </span>
          </div>

          {/* Recipient */}
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {task.recipient_name ? (
              <>
                <span style={{ color: 'var(--text-primary)' }}>{task.recipient_name}</span>
                {' · '}
                {task.recipient_email}
              </>
            ) : (
              task.recipient_email
            )}
          </p>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-faint)' }}>Status</p>
              <p className="text-sm font-medium" style={{ color: task.status === 'active' ? '#22d45f' : 'var(--text-muted)' }}>
                {STATUS_LABEL[task.status] ?? task.status}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-faint)' }}>Deadline</p>
              <p
                className="text-sm font-medium"
                style={{ color: deadline?.overdue ? '#ef4444' : 'var(--text-primary)' }}
              >
                {deadline ? deadline.text : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-faint)' }}>Nag count</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {task.nag_count} time{task.nag_count === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-faint)' }}>Reliability</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {recipient ? `${recipient.reliability_score.toFixed(1)}/10` : '—'}
              </p>
            </div>
          </div>

          {/* Context */}
          {task.context && (
            <div
              className="rounded-md px-4 py-3 text-sm mt-2"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              {task.context}
            </div>
          )}
        </div>

        {/* Actions */}
        {task.status !== 'done' && (
          <div className="mb-8">
            <TaskActions taskId={task.id} status={task.status} />
          </div>
        )}

        {/* Nag history */}
        <div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Nag history
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-faint)' }}>
            Full record of every reminder Arlo has sent.
          </p>

          {!nagLogs || nagLogs.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p style={{ color: 'var(--text-muted)' }}>
                No reminders sent yet. Arlo will nag on schedule.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {nagLogs.map((log, i) => (
                <NagLogEntry key={log.id} log={log} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
