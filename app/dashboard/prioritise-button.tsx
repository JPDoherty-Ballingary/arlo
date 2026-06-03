'use client'

import { useState } from 'react'
import Link from 'next/link'

type ActionType = 'chase' | 'action' | 'decision' | 'review'

type PrioritiseAction = {
  task_id: string | null
  action: string
  why: string
  estimated_minutes: number
  type: ActionType
}

type PrioritiseResult = {
  greeting: string
  actions: PrioritiseAction[]
  skip: string[]
}

const TIME_OPTIONS = [
  { label: '10 min', minutes: 10 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Rest of day', minutes: 480 },
]

const TYPE_STYLE: Record<ActionType, { label: string; bg: string; color: string }> = {
  chase:    { label: 'Chase',    bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  action:   { label: 'Action',   bg: 'rgba(34,212,95,0.15)',   color: '#22d45f' },
  decision: { label: 'Decision', bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  review:   { label: 'Review',   bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}

export default function PrioritiseButton() {
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PrioritiseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [skipOpen, setSkipOpen] = useState(false)

  async function handlePick(minutes: number) {
    setSelectedMinutes(minutes)
    setLoading(true)
    setError(null)
    setSkipOpen(false)
    try {
      const res = await fetch('/api/tasks/prioritise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableMinutes: minutes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setResult(data)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setResult(null)
    setError(null)
    setSkipOpen(false)
  }

  const selectedLabel = TIME_OPTIONS.find((o) => o.minutes === selectedMinutes)?.label ?? '30 min'

  return (
    <>
      <style>{`
        .prio-time-btn {
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.15s ease, color 0.15s ease,
                      border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .prio-time-btn:hover:not(:disabled) {
          transform: scale(1.08);
          background: #22d45f;
          color: #fff;
          border-color: #22d45f;
          box-shadow: 0 3px 14px rgba(34,212,95,0.35);
        }
        .prio-time-btn:active:not(:disabled) { transform: scale(0.95); }
      `}</style>

      {/* Card */}
      <div
        className="rounded-2xl flex flex-col items-center text-center px-8 py-10 mb-8"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)',
        }}
      >
        <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          What should I do right now?
        </p>
        <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Arlo is thinking…' : 'Pick your time window and Arlo will tell you.'}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              type="button"
              disabled={loading}
              onClick={() => handlePick(opt.minutes)}
              className="prio-time-btn px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading && selectedMinutes === opt.minutes ? '#22d45f' : 'var(--bg)',
                color: loading && selectedMinutes === opt.minutes ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {loading && selectedMinutes === opt.minutes ? 'Thinking…' : opt.label}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 mt-5">{error}</p>}
      </div>

      {/* Modal */}
      {result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              maxHeight: '90vh',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            }}
          >
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-base font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {result.greeting}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                {selectedLabel} · {result.actions.length} action{result.actions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-3">
              {result.actions.map((action, i) => {
                const ts = TYPE_STYLE[action.type] ?? TYPE_STYLE.action
                return (
                  <div
                    key={i}
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}
                  >
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {action.action}
                    </p>
                    <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {action.why}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ts.bg, color: ts.color }}>
                        {ts.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--border)', color: 'var(--text-faint)' }}>
                        ~{action.estimated_minutes} min
                      </span>
                      {action.task_id && (
                        <Link
                          href={`/tasks/${action.task_id}`}
                          onClick={handleClose}
                          className="text-xs ml-auto"
                          style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}
                        >
                          View task →
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}

              {result.skip && result.skip.length > 0 && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setSkipOpen((v) => !v)}
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <span>{skipOpen ? '▾' : '▸'}</span>
                    Deprioritised ({result.skip.length})
                  </button>
                  {skipOpen && (
                    <ul className="mt-2 flex flex-col gap-1 pl-3">
                      {result.skip.map((s, i) => (
                        <li key={i} className="text-xs" style={{ color: 'var(--text-faint)' }}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleClose}
                className="btn-green w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ color: '#fff' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
