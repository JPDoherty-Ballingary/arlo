'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/theme-toggle'
import Logo from '@/app/components/logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
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
            Log in
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="arlo-input"
              placeholder="••••••••"
            />
          </div>
          <div className="text-right -mt-2">
            <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: 'var(--text-faint)' }}>
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-green mt-2 w-full rounded-md px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link href="/signup" className="transition-colors hover:underline" style={{ color: '#22d45f' }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
