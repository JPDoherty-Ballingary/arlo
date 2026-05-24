'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Recipient = {
  id: string
  name: string | null
  email: string
}

type ParsedTask = {
  _id: string
  title: string
  context: string
  suggested_deadline: string | null
  urgency: 'low' | 'medium' | 'high'
  recipient_hint: string | null
  recipient_email: string
  recipient_name: string
}

const URGENCY_OPTIONS = ['low', 'medium', 'high'] as const

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 16)
}

function matchRecipient(hint: string | null, recipients: Recipient[]): Recipient | null {
  if (!hint || recipients.length === 0) return null
  const h = hint.toLowerCase()
  return recipients.find((r) => r.name && r.name.toLowerCase().includes(h)) ?? null
}

function RecipientAutocomplete({
  recipients,
  email,
  onEmailChange,
  onNameChange,
}: {
  recipients: Recipient[]
  email: string
  onEmailChange: (email: string) => void
  onNameChange: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(email)

  useEffect(() => {
    setQuery(email)
  }, [email])

  const filtered = query
    ? recipients.filter((r) => {
        const q = query.toLowerCase()
        return r.email.toLowerCase().includes(q) || (r.name?.toLowerCase().includes(q) ?? false)
      })
    : recipients

  function select(r: Recipient) {
    onEmailChange(r.email)
    onNameChange(r.name || '')
    setQuery(r.email)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onEmailChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="arlo-input"
        placeholder="colleague@company.com"
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute z-10 w-full mt-1 rounded-md overflow-auto"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            maxHeight: 200,
            top: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-faint)' }}>
              No saved recipients match — type a full email address
            </p>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => select(r)}
                className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="text-sm font-medium truncate">{r.name || r.email}</span>
                {r.name && (
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-faint)' }}>
                    {r.email}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function ReviewClient({
  transcriptId,
  meetingTitle,
  rawText,
  initialParsedTasks,
  initialRecipients,
}: {
  transcriptId: string
  meetingTitle: string
  rawText: string
  initialParsedTasks: Record<string, unknown>[]
  initialRecipients: Recipient[]
}) {
  const router = useRouter()
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [recipients] = useState<Recipient[]>(initialRecipients)
  const [tasks, setTasks] = useState<ParsedTask[]>(() =>
    initialParsedTasks.map((t, i) => {
      const hint = (t.recipient_hint as string | null) || null
      const matched = matchRecipient(hint, initialRecipients)
      return {
        _id: `task-${i}`,
        title: (t.title as string) || '',
        context: (t.context as string) || '',
        suggested_deadline: (t.suggested_deadline as string | null) || null,
        urgency: (['low', 'medium', 'high'].includes(t.urgency as string)
          ? t.urgency
          : 'medium') as 'low' | 'medium' | 'high',
        recipient_hint: hint,
        recipient_email: matched?.email || '',
        recipient_name: matched?.name || '',
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const allEmailsFilled =
    tasks.length > 0 && tasks.every((t) => t.recipient_email.trim() !== '')

  function updateTask(id: string, field: string, value: string) {
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, [field]: value } : t)))
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t._id !== id))
  }

  async function handleSave() {
    if (!allEmailsFilled) return
    setSaving(true)
    setSaveError(null)

    for (const task of tasks) {
      const deadline = task.suggested_deadline
        ? new Date(isoToDatetimeLocal(task.suggested_deadline)).toISOString()
        : null

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          context: task.context || null,
          recipient_email: task.recipient_email,
          recipient_name: task.recipient_name || null,
          urgency: task.urgency,
          deadline,
          frequency_hours: 24,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSaveError(`Failed to save "${task.title}": ${data.error}`)
        setSaving(false)
        return
      }
    }

    // Mark transcript as saved
    await fetch(`/api/transcripts/${transcriptId}`, { method: 'PATCH' })

    router.push('/dashboard')
    router.refresh()
  }

  if (tasks.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)' }}>
        Arlo found no action items in this transcript.
      </p>
    )
  }

  return (
    <div>
      {/* Raw transcript disclosure */}
      <div
        className="mb-8 rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={() => setTranscriptOpen((v) => !v)}
          className="w-full text-left px-4 py-3 flex items-center justify-between transition-colors"
          style={{ background: 'var(--surface)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            View full transcript
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 transition-transform ${transcriptOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-faint)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {transcriptOpen && (
          <div
            className="px-4 py-4 text-sm font-mono whitespace-pre-wrap"
            style={{
              background: 'var(--bg)',
              borderTop: '1px solid var(--border)',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            {rawText}
          </div>
        )}
      </div>

      {/* Task cards */}
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {tasks.length} action item{tasks.length === 1 ? '' : 's'} found
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Fill in recipient emails, edit anything Arlo got wrong, then save.
      </p>

      <div className="flex flex-col gap-4">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="rounded-lg p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="text-xs font-medium" style={{ color: '#22d45f' }}>
                Action item
              </span>
              <button
                type="button"
                onClick={() => removeTask(task._id)}
                className="text-sm transition-colors hover:text-red-500"
                style={{ color: 'var(--text-faint)' }}
              >
                ✕ Remove
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Task title
                </label>
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(task._id, 'title', e.target.value)}
                  className="arlo-input"
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  Context
                </label>
                <textarea
                  rows={2}
                  value={task.context}
                  onChange={(e) => updateTask(task._id, 'context', e.target.value)}
                  className="arlo-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Recipient email <span style={{ color: '#22d45f' }}>*</span>
                  </label>
                  <RecipientAutocomplete
                    recipients={recipients}
                    email={task.recipient_email}
                    onEmailChange={(v) => updateTask(task._id, 'recipient_email', v)}
                    onNameChange={(v) => updateTask(task._id, 'recipient_name', v)}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Recipient name
                  </label>
                  <input
                    type="text"
                    value={task.recipient_name}
                    onChange={(e) => updateTask(task._id, 'recipient_name', e.target.value)}
                    className="arlo-input"
                    placeholder={task.recipient_hint || 'e.g. Sarah'}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Urgency
                  </label>
                  <select
                    value={task.urgency}
                    onChange={(e) => updateTask(task._id, 'urgency', e.target.value)}
                    className="arlo-input"
                  >
                    {URGENCY_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={isoToDatetimeLocal(task.suggested_deadline)}
                    onChange={(e) => updateTask(task._id, 'suggested_deadline', e.target.value)}
                    className="arlo-input"
                    style={{ colorScheme: 'light dark' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saveError && <p className="mt-4 text-sm text-red-500">{saveError}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!allEmailsFilled || saving}
          className="btn-green px-6 py-2.5 rounded-md font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Save ${tasks.length} task${tasks.length === 1 ? '' : 's'} to Arlo`}
        </button>
        {!allEmailsFilled && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Fill in all recipient emails to continue
          </p>
        )}
        <Link
          href="/dashboard"
          className="text-sm transition-colors hover:underline"
          style={{ color: 'var(--text-faint)' }}
        >
          Skip
        </Link>
      </div>
    </div>
  )
}
