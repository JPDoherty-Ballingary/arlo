'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProjectPill from '@/app/components/project-pill'

type Project = { id: string; name: string; color: string }

type Task = {
  id: string
  title: string
  recipient_email: string
  recipient_name: string | null
  urgency: 'low' | 'medium' | 'high'
  status: 'active' | 'paused'
  deadline: string | null
  nag_count: number
  last_nagged_at: string | null
  owner_notified_of_claim: boolean
  scheduled_start_at: string | null
  note_count: number
  project_id: string | null
}

const URGENCY_BADGE: Record<string, { label: string }> = {
  low: { label: 'Low' },
  medium: { label: 'Medium' },
  high: { label: 'High' },
}

function formatDeadline(deadline: string | null): { text: string; overdue: boolean } | null {
  if (!deadline) return null
  const date = new Date(deadline)
  const now = new Date()
  const daysOverdue = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = date.toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (daysOverdue > 0) {
    return { text: `${formatted} — ${daysOverdue}d overdue`, overdue: true }
  }
  return { text: formatted, overdue: false }
}

function formatLastNagged(lastNaggedAt: string | null): string {
  if (!lastNaggedAt) return 'Never nagged'
  const diff = Date.now() - new Date(lastNaggedAt).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Last nagged just now'
  if (hours < 24) return `Last nagged ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Last nagged ${days}d ago`
}

export default function TaskCard({ task, project }: { task: Task; project?: Project }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteCount, setNoteCount] = useState(task.note_count)

  const badge = URGENCY_BADGE[task.urgency]
  const deadline = formatDeadline(task.deadline)
  const lastNagged = formatLastNagged(task.last_nagged_at)
  const isPaused = task.status === 'paused'

  const scheduledStart = task.scheduled_start_at ? new Date(task.scheduled_start_at) : null
  const isScheduledFuture = scheduledStart && scheduledStart > new Date()
  const scheduledStartLabel = isScheduledFuture
    ? `Starts ${scheduledStart.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })}`
    : null

  async function saveNote() {
    if (!noteContent.trim()) return
    setNoteSaving(true)
    const res = await fetch(`/api/tasks/${task.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent }),
    })
    if (res.ok) {
      setNoteCount((n) => n + 1)
      setNoteContent('')
      setAddingNote(false)
    }
    setNoteSaving(false)
  }

  async function updateStatus(status: 'done' | 'paused' | 'active') {
    setPending(true)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  async function rejectClaim() {
    setPending(true)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_action: 'reject' }),
      })
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="card-task rounded-lg p-5 flex flex-col gap-4 cursor-pointer"
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      {/* Header row */}
      <div
        className="flex items-start justify-between gap-3"
        style={{ opacity: isPaused ? 0.6 : 1 }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {task.title}
            </h3>
            {project && <ProjectPill name={project.name} color={project.color} />}
            {isPaused && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Paused
              </span>
            )}
            {task.owner_notified_of_claim && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
                style={{
                  background: 'var(--claim-badge-bg)',
                  color: 'var(--claim-badge-color)',
                  border: '1px solid #22d45f',
                }}
              >
                Claiming done
              </span>
            )}
            {noteCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--text-faint)',
                  border: '1px solid var(--border)',
                }}
              >
                {noteCount} note{noteCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {task.recipient_name || task.recipient_email}
            {task.recipient_name && (
              <span style={{ color: 'var(--text-faint)' }}> · {task.recipient_email}</span>
            )}
          </p>
        </div>

        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
          style={{
            background: `var(--badge-${task.urgency}-bg)`,
            color: `var(--badge-${task.urgency}-color)`,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Meta row */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
        style={{ color: 'var(--text-muted)', opacity: isPaused ? 0.6 : 1 }}
      >
        {deadline && (
          <span style={{ color: deadline.overdue ? '#ef4444' : 'var(--text-muted)' }}>
            {deadline.text}
          </span>
        )}
        {scheduledStartLabel ? (
          <span style={{ color: '#f59e0b' }}>{scheduledStartLabel}</span>
        ) : (
          <span>
            {task.nag_count === 0
              ? 'Not yet nagged'
              : `Nagged ${task.nag_count} time${task.nag_count === 1 ? '' : 's'}`}
          </span>
        )}
        <span>{lastNagged}</span>
      </div>

      {/* Action buttons — stop propagation so clicks don't navigate */}
      <div className="flex flex-col gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        {task.owner_notified_of_claim && (
          <div
            className="rounded-md px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
            style={{ background: 'var(--claim-badge-bg)', border: '1px solid #22d45f' }}
          >
            <span className="text-xs font-medium animate-pulse" style={{ color: 'var(--claim-badge-color)' }}>
              {task.recipient_name || task.recipient_email} says this is done
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus('done')}
                disabled={pending}
                className="btn-green px-3 py-1 rounded-md text-xs font-semibold disabled:opacity-40"
              >
                Confirm
              </button>
              <button
                onClick={rejectClaim}
                disabled={pending}
                className="px-3 py-1 rounded-md text-xs font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
              >
                Reject
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus('done')}
            disabled={pending}
            className="btn-green flex-1 py-1.5 rounded-md text-sm font-semibold disabled:opacity-40"
          >
            Mark done
          </button>
          <button
            onClick={() => updateStatus(isPaused ? 'active' : 'paused')}
            disabled={pending}
            className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#22d45f'
              e.currentTarget.style.color = '#22d45f'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setAddingNote((v) => !v)}
            className="px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-faint)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            + Note
          </button>
        </div>

        {addingNote && (
          <div className="flex flex-col gap-2">
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="arlo-input resize-none w-full text-sm"
              placeholder="Add a note…"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={saveNote}
                disabled={!noteContent.trim() || noteSaving}
                className="btn-green flex-1 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50"
              >
                {noteSaving ? 'Saving…' : 'Save note'}
              </button>
              <button
                onClick={() => { setAddingNote(false); setNoteContent('') }}
                className="flex-1 py-1.5 rounded-md text-sm transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
