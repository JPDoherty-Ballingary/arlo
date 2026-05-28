'use client'

import { useState } from 'react'

export default function PortalCompleteButton({ doneToken }: { doneToken: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleClick() {
    setState('loading')
    const res = await fetch(`/api/done/${doneToken}`, { method: 'POST' })
    setState(res.ok ? 'done' : 'error')
  }

  if (state === 'done') {
    return (
      <p className="text-sm font-medium" style={{ color: '#22d45f' }}>
        Got it — we&apos;ve let them know.
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
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="btn-green px-4 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50 shrink-0"
    >
      {state === 'loading' ? 'Sending…' : 'I\'ve completed this →'}
    </button>
  )
}
