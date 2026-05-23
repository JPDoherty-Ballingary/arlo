'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const FREQUENCY_OPTIONS = [
  { label: 'Every 4 hours', value: 4 },
  { label: 'Every 8 hours', value: 8 },
  { label: 'Twice a day', value: 12 },
  { label: 'Once a day', value: 24 },
  { label: 'Every 2 days', value: 48 },
  { label: 'Once a week', value: 168 },
]

const URGENCY_CONFIG = {
  low: {
    label: 'Low',
    inactive: { background: '#1a1e26', color: '#6b7280' },
    active: { background: '#1f2937', color: '#9ca3af', borderColor: '#6b7280' },
  },
  medium: {
    label: 'Medium',
    inactive: { background: '#2a1a00', color: '#92400e' },
    active: { background: '#451a03', color: '#f59e0b', borderColor: '#b45309' },
  },
  high: {
    label: 'High',
    inactive: { background: '#2a0a0a', color: '#991b1b' },
    active: { background: '#450a0a', color: '#ef4444', borderColor: '#b91c1c' },
  },
} as const

type Urgency = 'low' | 'medium' | 'high'

const inputStyle = {
  background: '#111111',
  border: '1px solid #1a1a1a',
}

const inputClass =
  'w-full rounded-md px-3 py-2 text-white placeholder-zinc-600 outline-none transition-[border-color]'

function focusGreen(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#22d45f'
}
function blurGrey(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#1a1a1a'
}

export default function NewTaskPage() {
  const router = useRouter()
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      frequency_hours: parseInt(data.get('frequency_hours') as string, 10),
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
    <div className="min-h-screen text-white" style={{ background: '#0a0a0a' }}>
      <nav
        className="px-6 py-4 flex items-center"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
      >
        <Link
          href="/dashboard"
          className="font-bold text-lg"
          style={{ color: '#22d45f', letterSpacing: '-0.02em' }}
        >
          ARLO
        </Link>
      </nav>

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">New task</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#888888' }}>
              Task title <span style={{ color: '#22d45f' }}>*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={focusGreen}
              onBlur={blurGrey}
              placeholder="e.g. Send the Q3 report to finance"
            />
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#888888' }}>
              Any context Arlo should know about
            </label>
            <textarea
              name="context"
              rows={3}
              className="w-full rounded-md px-3 py-2 text-white placeholder-zinc-600 outline-none resize-none transition-[border-color]"
              style={{ ...inputStyle }}
              onFocus={focusGreen}
              onBlur={blurGrey}
              placeholder="e.g. Agreed in Monday all-hands. Finance need it before end of month."
            />
          </div>

          {/* Recipient email */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#888888' }}>
              Recipient email <span style={{ color: '#22d45f' }}>*</span>
            </label>
            <input
              name="recipient_email"
              type="email"
              required
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={focusGreen}
              onBlur={blurGrey}
              placeholder="colleague@company.com"
            />
          </div>

          {/* Recipient name */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#888888' }}>
              Recipient name
            </label>
            <input
              name="recipient_name"
              type="text"
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={focusGreen}
              onBlur={blurGrey}
              placeholder="e.g. Sarah"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm mb-2" style={{ color: '#888888' }}>
              Urgency
            </label>
            <div className="flex gap-2">
              {(Object.keys(URGENCY_CONFIG) as Urgency[]).map((level) => {
                const cfg = URGENCY_CONFIG[level]
                const active = urgency === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      ...(active ? cfg.active : cfg.inactive),
                      border: active
                        ? `1px solid ${cfg.active.borderColor}`
                        : '1px solid transparent',
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#888888' }}>
              Deadline <span style={{ color: '#444' }}>(optional)</span>
            </label>
            <input
              name="deadline"
              type="datetime-local"
              className={inputClass}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={focusGreen}
              onBlur={blurGrey}
            />
          </div>

          {/* Nag frequency */}
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#888888' }}>
              Nag frequency
            </label>
            <select
              name="frequency_hours"
              defaultValue={24}
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={focusGreen}
              onBlur={blurGrey}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

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
              className="px-6 py-2.5 rounded-md font-semibold text-center text-sm transition-colors hover:text-white"
              style={{ border: '1px solid #1a1a1a', color: '#888888' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
