'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#0a0a0a' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xl font-bold"
            style={{ color: '#22d45f', letterSpacing: '-0.02em' }}
          >
            ARLO
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Log in</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: '#888888' }}
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-white placeholder-zinc-600 outline-none transition-colors"
              style={{
                background: '#111111',
                border: '1px solid #1a1a1a',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#22d45f')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1a1a1a')}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: '#888888' }}
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-white placeholder-zinc-600 outline-none transition-colors"
              style={{
                background: '#111111',
                border: '1px solid #1a1a1a',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#22d45f')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1a1a1a')}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-green mt-2 w-full rounded-md px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: '#888888' }}>
          No account?{' '}
          <Link
            href="/signup"
            className="transition-colors hover:text-white"
            style={{ color: '#22d45f' }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
