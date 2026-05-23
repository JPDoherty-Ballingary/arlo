'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

const inputClass =
  'w-full rounded-md px-3 py-2 text-white placeholder-zinc-600 outline-none transition-[border-color] text-sm'
const inputStyle = { background: '#111111', border: '1px solid #1a1a1a' }

function focusGreen(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) {
  e.currentTarget.style.borderColor = '#22d45f'
}
function blurGrey(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) {
  e.currentTarget.style.borderColor = '#1a1a1a'
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
        onFocus={(e) => {
          setOpen(true)
          focusGreen(e)
        }}
        onBlur={(e) => {
          setTimeout(() => setOpen(false), 150)
          blurGrey(e)
        }}
        className={inputClass}
        style={{ ...inputStyle }}
        placeholder="colleague@company.com"
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute z-10 w-full mt-1 rounded-md overflow-auto"
          style={{
            background: '#0f0f0f',
            border: '1px solid #2a2a2a',
            maxHeight: 200,
            top: '100%',
          }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: '#555' }}>
              No saved recipients match — type a full email address
            </p>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => select(r)}
                className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-zinc-800 transition-colors"
              >
                <span className="text-sm text-white font-medium truncate">{r.name || r.email}</span>
                {r.name && (
                  <span className="text-xs shrink-0" style={{ color: '#555' }}>
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

export default function TranscriptsNewPage() {
  const router = useRouter()
  const [transcript, setTranscript] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<ParsedTask[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('recipients')
      .select('id, name, email')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setRecipients(data)
      })
  }, [])

  const allEmailsFilled =
    tasks !== null && tasks.length > 0 && tasks.every((t) => t.recipient_email.trim() !== '')

  async function handleParse(e: React.FormEvent) {
    e.preventDefault()
    setParseError(null)
    setTasks(null)
    setParsing(true)

    const res = await fetch('/api/transcripts/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })

    const json = await res.json()
    setParsing(false)

    if (!res.ok) {
      setParseError(json.error || 'Something went wrong')
      return
    }

    const parsed: ParsedTask[] = (json as unknown[]).map((item: unknown, i: number) => {
      const t = item as Record<string, unknown>
      const hint = (t.recipient_hint as string | null) || null
      const matched = matchRecipient(hint, recipients)
      return {
        _id: `task-${i}-${Date.now()}`,
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

    setTasks(parsed)
  }

  function updateTask(id: string, field: string, value: string) {
    setTasks((prev) =>
      prev ? prev.map((t) => (t._id === id ? { ...t, [field]: value } : t)) : prev
    )
  }

  function removeTask(id: string) {
    setTasks((prev) => (prev ? prev.filter((t) => t._id !== id) : prev))
  }

  async function handleSave() {
    if (!tasks || !allEmailsFilled) return
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

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0a0a' }}>
      <nav
        className="px-6 py-4 flex items-center justify-between"
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">Parse transcript</h1>

        {/* Transcript input */}
        <form onSubmit={handleParse} className="flex flex-col gap-4">
          <label className="block text-sm mb-1" style={{ color: '#888888' }}>
            Paste your meeting transcript
          </label>
          <textarea
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            required
            className="w-full rounded-md px-4 py-3 text-white placeholder-zinc-600 outline-none resize-y transition-[border-color]"
            style={{ background: '#111111', border: '1px solid #1a1a1a' }}
            onFocus={focusGreen}
            onBlur={blurGrey}
            placeholder="Paste the full transcript here — Arlo will extract all action items automatically."
          />
          {parseError && <p className="text-sm text-red-400">{parseError}</p>}
          <button
            type="submit"
            disabled={parsing || !transcript.trim()}
            className="btn-green self-start px-6 py-2.5 rounded-md font-semibold text-sm disabled:opacity-50"
          >
            {parsing ? 'Arlo is reading the transcript…' : 'Parse with Arlo →'}
          </button>
        </form>

        {/* Extracted tasks */}
        {tasks !== null && (
          <div className="mt-12">
            {tasks.length === 0 ? (
              <p style={{ color: '#888888' }}>
                Arlo found no action items in this transcript. Try a different one.
              </p>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white mb-1">
                  {tasks.length} action item{tasks.length === 1 ? '' : 's'} found
                </h2>
                <p className="text-sm mb-6" style={{ color: '#888888' }}>
                  Fill in recipient emails, edit anything Arlo got wrong, then save.
                </p>

                <div className="flex flex-col gap-4">
                  {tasks.map((task) => (
                    <div
                      key={task._id}
                      className="rounded-lg p-5"
                      style={{ background: '#111111', border: '1px solid #1a1a1a' }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <span className="text-xs font-medium" style={{ color: '#22d45f' }}>
                          Action item
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTask(task._id)}
                          className="text-sm transition-colors hover:text-red-400"
                          style={{ color: '#555' }}
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Title */}
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#888888' }}>
                            Task title
                          </label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task._id, 'title', e.target.value)}
                            className={inputClass}
                            style={{ ...inputStyle }}
                            onFocus={focusGreen}
                            onBlur={blurGrey}
                          />
                        </div>

                        {/* Context */}
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#888888' }}>
                            Context
                          </label>
                          <textarea
                            rows={2}
                            value={task.context}
                            onChange={(e) => updateTask(task._id, 'context', e.target.value)}
                            className="w-full rounded-md px-3 py-2 text-white placeholder-zinc-600 outline-none resize-none transition-[border-color] text-sm"
                            style={{ ...inputStyle }}
                            onFocus={focusGreen}
                            onBlur={blurGrey}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Recipient email — autocomplete */}
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#888888' }}>
                              Recipient email{' '}
                              <span style={{ color: '#22d45f' }}>*</span>
                            </label>
                            <RecipientAutocomplete
                              recipients={recipients}
                              email={task.recipient_email}
                              onEmailChange={(v) => updateTask(task._id, 'recipient_email', v)}
                              onNameChange={(v) => updateTask(task._id, 'recipient_name', v)}
                            />
                          </div>

                          {/* Recipient name */}
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#888888' }}>
                              Recipient name
                            </label>
                            <input
                              type="text"
                              value={task.recipient_name}
                              onChange={(e) =>
                                updateTask(task._id, 'recipient_name', e.target.value)
                              }
                              className={inputClass}
                              style={{ ...inputStyle }}
                              onFocus={focusGreen}
                              onBlur={blurGrey}
                              placeholder={task.recipient_hint || 'e.g. Sarah'}
                            />
                          </div>

                          {/* Urgency */}
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#888888' }}>
                              Urgency
                            </label>
                            <select
                              value={task.urgency}
                              onChange={(e) =>
                                updateTask(task._id, 'urgency', e.target.value)
                              }
                              className={inputClass}
                              style={{ ...inputStyle }}
                              onFocus={focusGreen}
                              onBlur={blurGrey}
                            >
                              {URGENCY_OPTIONS.map((u) => (
                                <option key={u} value={u}>
                                  {u.charAt(0).toUpperCase() + u.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Deadline */}
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#888888' }}>
                              Deadline
                            </label>
                            <input
                              type="datetime-local"
                              value={isoToDatetimeLocal(task.suggested_deadline)}
                              onChange={(e) =>
                                updateTask(task._id, 'suggested_deadline', e.target.value)
                              }
                              className={inputClass}
                              style={{ ...inputStyle, colorScheme: 'dark' }}
                              onFocus={focusGreen}
                              onBlur={blurGrey}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {saveError && <p className="mt-4 text-sm text-red-400">{saveError}</p>}

                <div className="mt-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!allEmailsFilled || saving}
                    className="btn-green px-6 py-2.5 rounded-md font-semibold text-sm disabled:opacity-50"
                  >
                    {saving
                      ? 'Saving…'
                      : `Save ${tasks.length} task${tasks.length === 1 ? '' : 's'} to Arlo`}
                  </button>
                  {!allEmailsFilled && (
                    <p className="text-xs" style={{ color: '#888888' }}>
                      Fill in all recipient emails to continue
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
