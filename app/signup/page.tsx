'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/theme-toggle'
import Logo from '@/app/components/logo'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
          <div className="mb-8">
            <Logo className="h-9 w-auto" />
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Check your email
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            We sent a confirmation link to{' '}
            <span style={{ color: 'var(--text-primary)' }}>{email}</span>.
            Click it to activate your account.
          </p>
          <p className="mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Already confirmed?{' '}
            <Link href="/login" className="hover:underline" style={{ color: '#22d45f' }}>
              Log in
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
          <Link href="/">
            <Logo className="h-9 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Create your account
          </h1>
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
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="arlo-input"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-green mt-2 w-full rounded-md px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="hover:underline" style={{ color: '#22d45f' }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
