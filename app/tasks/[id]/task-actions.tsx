'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TaskActions({
  taskId,
  status,
}: {
  taskId: string
  status: 'active' | 'paused' | 'done'
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function updateStatus(newStatus: 'done' | 'paused' | 'active') {
    setPending(true)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
    setPending(false)
  }

  if (status === 'done') return null

  const isPaused = status === 'paused'

  return (
    <div className="flex gap-3">
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
    </div>
  )
}
