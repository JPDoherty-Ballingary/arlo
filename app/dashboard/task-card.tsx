'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function TaskCard({ task }: { task: Task }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const badge = URGENCY_BADGE[task.urgency]
  const deadline = formatDeadline(task.deadline)
  const lastNagged = formatLastNagged(task.last_nagged_at)
  const isPaused = task.status === 'paused'

  async function updateStatus(status: 'done' | 'paused' | 'active') {
    setPending(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
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
                Claiming done — confirm?
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
        <span>
          {task.nag_count === 0
            ? 'Not yet nagged'
            : `Nagged ${task.nag_count} time${task.nag_count === 1 ? '' : 's'}`}
        </span>
        <span>{lastNagged}</span>
      </div>

      {/* Action buttons — stop propagation so clicks don't navigate */}
      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  )
}
