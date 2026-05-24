'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TaskEditForm from './task-edit-form'

type Task = {
  id: string
  title: string
  context: string | null
  recipient_email: string
  recipient_name: string | null
  urgency: 'low' | 'medium' | 'high'
  deadline: string | null
  frequency_hours: number
  scheduled_start_at: string | null
  status: 'active' | 'paused' | 'done'
}

export default function TaskActions({ task }: { task: Task }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nagging, setNagging] = useState(false)
  const [nagResult, setNagResult] = useState<string | null>(null)

  async function updateStatus(newStatus: 'done' | 'paused' | 'active') {
    setPending(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
    setPending(false)
  }

  async function nagNow() {
    setNagging(true)
    setNagResult(null)
    const res = await fetch(`/api/tasks/${task.id}/nag`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setNagResult(`Error: ${data.error}`)
    } else {
      setNagResult(data.action === 'send_nag' || data.action === 'send_escalation'
        ? `Nag sent (${data.tone})`
        : `Action: ${data.action}`)
      router.refresh()
    }
    setNagging(false)
  }

  if (task.status === 'done') return null

  if (editing) {
    return (
      <TaskEditForm
        task={task}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); router.refresh() }}
      />
    )
  }

  const isPaused = task.status === 'paused'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
      <button
        onClick={() => updateStatus('done')}
        disabled={pending}
        className="btn-green px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
      >
        Mark done
      </button>
      <button
        onClick={() => updateStatus(isPaused ? 'active' : 'paused')}
        disabled={pending}
        className="px-5 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50"
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
        onClick={() => setEditing(true)}
        disabled={pending}
        className="px-5 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50"
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
        Edit
      </button>
      <button
        onClick={nagNow}
        disabled={nagging || pending}
        className="px-5 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50"
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
        {nagging ? 'Sending…' : 'Nag now'}
      </button>
    </div>
    {nagResult && (
      <p className="text-xs" style={{ color: nagResult.startsWith('Error') ? '#ef4444' : '#22d45f' }}>
        {nagResult}
      </p>
    )}
    </div>
  )
}
