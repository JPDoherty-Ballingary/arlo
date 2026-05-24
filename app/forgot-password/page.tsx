'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/theme-toggle'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-xl font-bold mb-8" style={{ color: '#22d45f', letterSpacing: '-0.02em' }}>
            ARLO
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Check your email
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            If an account exists for{' '}
            <span style={{ color: 'var(--text-primary)' }}>{email}</span>, we&apos;ve
            sent a password reset link.
          </p>
          <p className="mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Link href="/login" className="hover:underline" style={{ color: '#22d45f' }}>
              Back to log in
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/" className="text-xl font-bold" style={{ color: '#22d45f', letterSpacing: '-0.02em' }}>
            ARLO
          </Link>
          <h1 className="mt-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Reset your password
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="arlo-input"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-green mt-2 w-full rounded-md px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/login" className="hover:underline" style={{ color: '#22d45f' }}>
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  )
}
