'use client'

import { useState } from 'react'

export default function ClaimButton({ token, taskTitle }: { token: string; taskTitle: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleClaim() {
    setState('loading')
    const res = await fetch(`/api/done/${token}`, { method: 'POST' })
    setState(res.ok ? 'done' : 'error')
  }

  if (state === 'done') {
    return (
      <p className="text-sm font-medium" style={{ color: '#22d45f' }}>
        Got it — we&apos;ve let them know. They&apos;ll confirm it on their end.
      </p>
    )
  }

  if (state === 'error') {
    return (
      <p className="text-sm" style={{ color: '#ef4444' }}>
        Something went wrong. Please try again.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 items-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Confirm you&apos;ve completed:
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{taskTitle}&rdquo;</strong>
      </p>
      <button
        onClick={handleClaim}
        disabled={state === 'loading'}
        className="btn-green px-6 py-3 rounded-md font-semibold text-sm disabled:opacity-50"
      >
        {state === 'loading' ? 'Confirming…' : 'Yes, I\'ve completed this →'}
      </button>
    </div>
  )
}
