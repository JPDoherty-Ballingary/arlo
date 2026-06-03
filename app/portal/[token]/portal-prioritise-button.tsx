'use client'

import { useState, useEffect } from 'react'

type ActionType = 'action' | 'decision' | 'review' | 'respond'

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
  action:   { label: 'Action',   bg: 'rgba(34,212,95,0.15)',   color: '#22d45f' },
  decision: { label: 'Decision', bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  review:   { label: 'Review',   bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  respond:  { label: 'Respond',  bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
}

const HIGHLIGHT_CLASS = 'portal-task-highlight'

export default function PortalPrioritiseButton({ token }: { token: string }) {
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<PrioritiseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [skipOpen, setSkipOpen] = useState(false)

  useEffect(() => {
    if (status !== 'done' || !result) {
      document.querySelectorAll('[data-portal-task-id]').forEach((el) => {
        el.classList.remove(HIGHLIGHT_CLASS)
      })
      return
    }
    const highlightedIds = new Set(result.actions.map((a) => a.task_id).filter(Boolean))
    document.querySelectorAll('[data-portal-task-id]').forEach((el) => {
      const id = el.getAttribute('data-portal-task-id')
      if (id && highlightedIds.has(id)) el.classList.add(HIGHLIGHT_CLASS)
    })
    return () => {
      document.querySelectorAll('[data-portal-task-id]').forEach((el) => {
        el.classList.remove(HIGHLIGHT_CLASS)
      })
    }
  }, [status, result])

  async function handleClick() {
    setStatus('loading')
    setError(null)
    setSkipOpen(false)
    try {
      const res = await fetch('/api/portal/prioritise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, availableMinutes: selectedMinutes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setStatus('idle')
        return
      }
      setResult(data)
      setStatus('done')
    } catch {
      setError('Something went wrong')
      setStatus('idle')
    }
  }

  function handleClose() {
    setStatus('idle')
    setResult(null)
    setError(null)
    setSkipOpen(false)
  }

  return (
    <>
      <style>{`
        .${HIGHLIGHT_CLASS} {
          outline: 2px solid #22d45f !important;
          outline-offset: 2px;
        }
      `}</style>

      {/* Card */}
      <div
        className="rounded-2xl flex flex-col items-center text-center px-8 py-10"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-faint)' }}>
          Arlo
        </p>

        <button
          onClick={handleClick}
          disabled={status === 'loading'}
          className="btn-green px-8 py-3 rounded-xl text-base font-semibold disabled:opacity-60 mb-6"
          style={{ boxShadow: '0 2px 12px rgba(34,212,95,0.25)' }}
        >
          {status === 'loading' ? 'Thinking…' : 'What should I do right now?'}
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => setSelectedMinutes(opt.minutes)}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                selectedMinutes === opt.minutes
                  ? {
                      background: 'var(--text-primary)',
                      color: 'var(--bg)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    }
                  : { background: 'var(--border)', color: 'var(--text-muted)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-4">{error}</p>
        )}
      </div>

      {/* Modal */}
      {status === 'done' && result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
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
            {/* Header */}
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-base font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {result.greeting}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                {TIME_OPTIONS.find((o) => o.minutes === selectedMinutes)?.label ?? '30 min'} ·{' '}
                {result.actions.length} action{result.actions.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Actions */}
            <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-3">
              {result.actions.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  Nothing to prioritise right now — you&apos;re on top of it.
                </p>
              ) : (
                result.actions.map((action, i) => {
                  const typeStyle = TYPE_STYLE[action.type] ?? TYPE_STYLE.action
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
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: typeStyle.bg, color: typeStyle.color }}
                        >
                          {typeStyle.label}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--border)', color: 'var(--text-faint)' }}
                        >
                          ~{action.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Deprioritised */}
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
                        <li key={i} className="text-xs" style={{ color: 'var(--text-faint)' }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleClose}
                className="btn-green w-full py-2.5 rounded-xl text-sm font-semibold"
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
