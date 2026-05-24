'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/theme-toggle'
import Logo from '@/app/components/logo'

const FREQUENCY_OPTIONS = [
  { label: 'Every 4 hours', value: 4 },
  { label: 'Every 8 hours', value: 8 },
  { label: 'Twice a day', value: 12 },
  { label: 'Once a day', value: 24 },
  { label: 'Every 2 days', value: 48 },
  { label: 'Once a week', value: 168 },
]

type Urgency = 'low' | 'medium' | 'high'

const URGENCY_CLASSES: Record<Urgency, { active: string; inactive: string; label: string }> = {
  low: {
    label: 'Low',
    inactive: 'bg-slate-100 text-slate-500 border-transparent dark:bg-[#1a1e26] dark:text-[#6b7280]',
    active: 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-[#1f2937] dark:text-[#9ca3af] dark:border-[#6b7280]',
  },
  medium: {
    label: 'Medium',
    inactive: 'bg-amber-50 text-amber-700 border-transparent dark:bg-[#2a1a00] dark:text-[#92400e]',
    active: 'bg-amber-100 text-amber-800 border-amber-500 dark:bg-[#451a03] dark:text-[#f59e0b] dark:border-[#b45309]',
  },
  high: {
    label: 'High',
    inactive: 'bg-red-50 text-red-600 border-transparent dark:bg-[#2a0a0a] dark:text-[#991b1b]',
    active: 'bg-red-100 text-red-800 border-red-500 dark:bg-[#450a0a] dark:text-[#ef4444] dark:border-[#b91c1c]',
  },
}

export default function NewTaskPage() {
  const router = useRouter()
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [frequency, setFrequency] = useState(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('default_frequency_hours, default_urgency')
          .limit(1)
          .maybeSingle()
        if (data) {
          if (data.default_frequency_hours) setFrequency(data.default_frequency_hours)
          if (data.default_urgency && ['low', 'medium', 'high'].includes(data.default_urgency)) {
            setUrgency(data.default_urgency as Urgency)
          }
        }
      } catch {
        // profiles table may not exist yet — silently ignore
      }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const data = new FormData(e.currentTarget)
    const deadline = data.get('deadline') as string

    const body = {
      title: data.get('title') as string,
      context: (data.get('context') as string) || null,
      recipient_email: data.get('recipient_email') as string,
      recipient_name: (data.get('recipient_name') as string) || null,
      urgency,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      frequency_hours: frequency,
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      const json = await res.json()
      setError(json.error || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/dashboard">
          <Logo className="h-8 w-auto" />
        </Link>
        <ThemeToggle />
      </nav>

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          New task
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Task title <span style={{ color: '#22d45f' }}>*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              className="arlo-input"
              placeholder="e.g. Send the Q3 report to finance"
            />
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Any context Arlo should know about
            </label>
            <textarea
              name="context"
              rows={3}
              className="arlo-input resize-none"
              placeholder="e.g. Agreed in Monday all-hands. Finance need it before end of month."
            />
          </div>

          {/* Recipient email */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Recipient email <span style={{ color: '#22d45f' }}>*</span>
            </label>
            <input
              name="recipient_email"
              type="email"
              required
              className="arlo-input"
              placeholder="colleague@company.com"
            />
          </div>

          {/* Recipient name */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Recipient name
            </label>
            <input
              name="recipient_name"
              type="text"
              className="arlo-input"
              placeholder="e.g. Sarah"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              Urgency
            </label>
            <div className="flex gap-2">
              {(Object.keys(URGENCY_CLASSES) as Urgency[]).map((level) => {
                const cfg = URGENCY_CLASSES[level]
                const active = urgency === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all border ${active ? cfg.active : cfg.inactive}`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Deadline{' '}
              <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
            </label>
            <input
              name="deadline"
              type="datetime-local"
              className="arlo-input"
              style={{ colorScheme: 'light dark' }}
            />
          </div>

          {/* Nag frequency */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Nag frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value, 10))}
              className="arlo-input"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-green flex-1 py-2.5 rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create task'}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-md font-semibold text-center text-sm transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
