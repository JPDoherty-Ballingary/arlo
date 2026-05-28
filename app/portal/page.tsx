'use client'

import { useState } from 'react'
import Logo from '@/app/components/logo'

type State = 'idle' | 'loading' | 'success' | 'not_found' | 'error'

export default function PortalPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')

    const res = await fetch('/api/portal/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    if (res.ok) {
      setState('success')
      return
    }

    const data = await res.json()
    if (res.status === 404) {
      setErrorMsg(data.error)
      setState('not_found')
    } else {
      setState('error')
    }
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
                We&apos;ve sent a login link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                It expires in 7 days.
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

                {(state === 'not_found' || state === 'error') && (
                  <p className="text-sm" style={{ color: '#ef4444', lineHeight: 1.5 }}>
                    {state === 'not_found'
                      ? errorMsg
                      : 'Something went wrong. Please try again.'}
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
