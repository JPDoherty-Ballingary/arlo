'use client'

import { useState } from 'react'
import Logo from '@/app/components/logo'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function PortalPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')

    const res = await fetch('/api/portal/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    // The API always returns a generic { ok: true } for any well-formed
    // request — whether or not the email belongs to a known recipient —
    // so this can't be used to enumerate accounts. Only a genuine request
    // failure (bad JSON, 500, etc.) falls through to the error state.
    setState(res.ok ? 'success' : 'error')
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        <Logo className="h-8 w-auto mx-auto mb-10" />

        <div
          className="rounded-lg p-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {state === 'success' ? (
            <div className="text-center">
              <p className="text-lg font-semibold mb-2" style={{ color: '#22d45f' }}>
                Check your inbox
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                If <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> has been
                assigned tasks through Arlo, we&apos;ve sent a login link and deactivated any
                older one. The new link expires in 7 days.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Arlo recipient portal
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter your email address to receive a login link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setState('idle') }}
                  required
                  placeholder="you@example.com"
                  className="arlo-input"
                  autoComplete="email"
                />

                {state === 'error' && (
                  <p className="text-sm" style={{ color: '#ef4444', lineHeight: 1.5 }}>
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === 'loading' || !email.trim()}
                  className="btn-green py-2.5 rounded-md font-semibold text-sm disabled:opacity-50"
                >
                  {state === 'loading' ? 'Sending…' : 'Send login link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
