import { supabaseAdmin } from '@/lib/supabase/admin'
import Logo from '@/app/components/logo'
import PortalCompleteButton from './portal-complete-button'
import PortalAddNote from './portal-add-note'
import PortalPrioritiseButton from './portal-prioritise-button'

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function sortByUrgency<T extends { urgency: string; deadline: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2)
    if (diff !== 0) return diff
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
}

function formatDeadline(iso: string): { text: string; overdue: boolean } {
  const date = new Date(iso)
  const overdue = date < new Date()
  return {
    text: date.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    overdue,
  }
}

function nagLabel(count: number): string {
  if (count === 0) return 'Not yet reminded'
  if (count === 1) return 'Reminded once'
  return `Reminded ${count} times`
}

export default async function PortalTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: session } = await supabaseAdmin
    .from('recipient_sessions')
    .select('id, email, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!session || new Date(session.expires_at) < new Date()) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: 'var(--bg)' }}
      >
        <div className="w-full max-w-sm text-center">
          <Logo className="h-8 w-auto mx-auto mb-8" />
          <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            This link has expired
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Request a new one at{' '}
            <a
              href={`${process.env.NEXT_PUBLIC_APP_URL}/portal`}
              className="underline"
              style={{ color: '#22d45f' }}
            >
              agent-arlo.com/portal
            </a>
          </p>
        </div>
      </main>
    )
  }

  const { email } = session

  // Fetch all active tasks for this recipient across all owners
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, deadline, urgency, nag_count, owner_id, done_token, recipient_name')
    .eq('recipient_email', email)
    .eq('status', 'active')

  // Fetch reliability stats across all owners for this email
  const { data: recipientRows } = await supabaseAdmin
    .from('recipients')
    .select('tasks_completed, total_nags')
    .eq('email', email)

  const totalCompleted = (recipientRows ?? []).reduce((s, r) => s + (r.tasks_completed ?? 0), 0)
  const totalNags = (recipientRows ?? []).reduce((s, r) => s + (r.total_nags ?? 0), 0)
  const avgNags = totalCompleted > 0 ? (totalNags / totalCompleted).toFixed(1) : null

  // Group tasks by owner
  const ownerIds = [...new Set((tasks ?? []).map((t) => t.owner_id))]

  // Fetch owner profiles (display name), fall back to auth email
  const profileResults = await Promise.all(
    ownerIds.map((id) =>
      supabaseAdmin.from('profiles').select('id, display_name').eq('id', id).maybeSingle()
    )
  )
  const profileMap = new Map<string, string>()
  for (let i = 0; i < ownerIds.length; i++) {
    const profile = profileResults[i].data
    if (profile?.display_name) {
      profileMap.set(ownerIds[i], profile.display_name)
    } else {
      // Fall back to auth email
      const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(ownerIds[i])
      profileMap.set(ownerIds[i], ownerData.user?.email ?? 'Your manager')
    }
  }

  // Determine recipient's display name
  const recipientName =
    (tasks ?? []).find((t) => t.recipient_name)?.recipient_name ||
    email.split('@')[0]

  // Fetch notes and nag logs for all tasks
  const taskIds = (tasks ?? []).map((t) => t.id)

  const [{ data: allNotes }, { data: allNagLogs }] = await Promise.all([
    taskIds.length > 0
      ? supabaseAdmin
          .from('task_notes')
          .select('id, task_id, content, created_at, author_email')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    taskIds.length > 0
      ? supabaseAdmin
          .from('nag_logs')
          .select('id, task_id, sent_at, subject')
          .in('task_id', taskIds)
          .order('sent_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  type NoteRow = { id: string; task_id: string; content: string; created_at: string; author_email: string | null }
  type NagRow = { id: string; task_id: string; sent_at: string; subject: string | null }

  const notesByTask = new Map<string, NoteRow[]>()
  for (const note of (allNotes ?? []) as NoteRow[]) {
    notesByTask.set(note.task_id, [...(notesByTask.get(note.task_id) ?? []), note])
  }

  const nagsByTask = new Map<string, NagRow[]>()
  for (const nag of (allNagLogs ?? []) as NagRow[]) {
    nagsByTask.set(nag.task_id, [...(nagsByTask.get(nag.task_id) ?? []), nag])
  }

  const tasksByOwner = new Map<string, typeof tasks>()
  for (const task of tasks ?? []) {
    tasksByOwner.set(task.owner_id, [...(tasksByOwner.get(task.owner_id) ?? []), task])
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        <Logo className="h-8 w-auto mb-10" />

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Hi {recipientName}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Here&apos;s what&apos;s outstanding for you across all your Arlo accounts.
        </p>

        {tasks && tasks.length > 0 && (
          <div className="mb-10">
            <PortalPrioritiseButton token={token} />
          </div>
        )}

        {!tasks || tasks.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center mb-10"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p style={{ color: 'var(--text-muted)' }}>
              Nothing outstanding — you&apos;re all caught up.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 mb-10">
            {ownerIds.map((ownerId) => {
              const ownerTasks = sortByUrgency(tasksByOwner.get(ownerId) ?? [])
              const ownerName = profileMap.get(ownerId) ?? 'Your manager'
              return (
                <div key={ownerId}>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    Assigned by {ownerName}
                  </p>
                  <div className="flex flex-col gap-3">
                    {ownerTasks.map((task) => {
                      const deadline = task.deadline ? formatDeadline(task.deadline) : null
                      return (
                        <div
                          key={task.id}
                          data-portal-task-id={task.id}
                          className="rounded-lg p-5"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-semibold leading-tight mb-1"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {task.title}
                              </p>
                              <div
                                className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {deadline && (
                                  <span style={{ color: deadline.overdue ? '#ef4444' : 'var(--text-muted)' }}>
                                    {deadline.overdue ? 'Overdue · ' : 'Due '}
                                    {deadline.text}
                                  </span>
                                )}
                                <span>{nagLabel(task.nag_count)}</span>
                              </div>
                            </div>
                            <PortalCompleteButton doneToken={task.done_token} />
                          </div>
                          {(nagsByTask.get(task.id) ?? []).length > 0 && (
                            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-faint)' }}>
                                Reminder history
                              </p>
                              <div className="flex flex-col gap-1">
                                {(nagsByTask.get(task.id) ?? []).map((nag) => (
                                  <p key={nag.id} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(nag.sent_at).toLocaleString('en-GB', {
                                      timeZone: 'Europe/London',
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {nag.subject && (
                                      <span style={{ color: 'var(--text-faint)' }}> · {nag.subject}</span>
                                    )}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          <PortalAddNote
                            taskId={task.id}
                            portalToken={token}
                            initialNotes={notesByTask.get(task.id) ?? []}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Reliability summary */}
        <div
          className="rounded-lg px-6 py-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Your track record
          </p>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            You&apos;ve completed <strong style={{ color: 'var(--text-primary)' }}>{totalCompleted}</strong>{' '}
            task{totalCompleted === 1 ? '' : 's'} through Arlo.
          </p>
          {avgNags !== null && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Average reminders before completion:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{avgNags}</strong>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
