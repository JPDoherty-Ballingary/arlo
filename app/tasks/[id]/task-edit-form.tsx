'use client'

import { useState, useEffect, useRef } from 'react'

type Contact = { id: string; email: string; name: string | null }

type Task = {
  id: string
  title: string
  context: string | null
  recipient_email: string
  recipient_name: string | null
  urgency: 'low' | 'medium' | 'high'
  deadline: string | null
  frequency_hours: number
  scheduled_start_at: string | null
}

type Props = {
  task: Task
  onCancel: () => void
  onSaved: () => void
}

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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

export default function TaskEditForm({ task, onCancel, onSaved }: Props) {
  const [title, setTitle] = useState(task.title)
  const [context, setContext] = useState(task.context ?? '')
  const [urgency, setUrgency] = useState<Urgency>(task.urgency)
  const [deadline, setDeadline] = useState(toDatetimeLocal(task.deadline))
  const [frequency, setFrequency] = useState(task.frequency_hours)
  const [scheduledStart, setScheduledStart] = useState(toDatetimeLocal(task.scheduled_start_at))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contact selector
  const [contacts, setContacts] = useState<Contact[]>([])
  const [recipientEmail, setRecipientEmail] = useState(task.recipient_email)
  const [recipientName, setRecipientName] = useState(task.recipient_name ?? '')
  const [inputValue, setInputValue] = useState(task.recipient_name || task.recipient_email)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const selectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/contacts')
        if (res.ok) setContacts(await res.json())
      } catch {}
    })()
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const filteredContacts = contacts.filter((c) => {
    if (!inputValue.trim()) return true
    const q = inputValue.toLowerCase()
    return c.email.toLowerCase().includes(q) || (c.name?.toLowerCase().includes(q) ?? false)
  })

  function selectContact(c: Contact) {
    setSelectedContact(c)
    setRecipientEmail(c.email)
    setRecipientName(c.name ?? '')
    setInputValue(c.name || c.email)
    setDropdownOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    setSelectedContact(null)
    setRecipientEmail(val)
    setRecipientName('')
    setDropdownOpen(true)
  }

  async function handleSave() {
    setError(null)
    if (!title.trim()) { setError('Title is required'); return }
    if (!recipientEmail.trim()) { setError('Recipient email is required'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          context: context.trim() || null,
          recipient_email: recipientEmail.trim(),
          recipient_name: recipientName.trim() || null,
          urgency,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          frequency_hours: frequency,
          scheduled_start_at: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-lg p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
        Edit task
      </h2>

      <div className="flex flex-col gap-5">
        {/* Title */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Task title <span style={{ color: '#22d45f' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="arlo-input"
            autoFocus
          />
        </div>

        {/* Context */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Context
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            className="arlo-input resize-none"
            placeholder="Any context ARLO should know about…"
          />
        </div>

        {/* Recipient */}
        <div ref={selectorRef}>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Recipient <span style={{ color: '#22d45f' }}>*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={(e) => e.key === 'Escape' && setDropdownOpen(false)}
              className="arlo-input"
              placeholder="Search contacts or type an email…"
              autoComplete="off"
            />
            {dropdownOpen && (
              <div
                className="absolute z-10 w-full mt-1 rounded-md overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectContact(c) }}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <p className="text-sm font-medium leading-none" style={{ color: 'var(--text-primary)' }}>
                        {c.name || c.email}
                      </p>
                      {c.name && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                          {c.email}
                        </p>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-faint)' }}>
                    {inputValue.trim() ? 'No matching contacts.' : 'No contacts yet.'}
                  </p>
                )}
              </div>
            )}
          </div>
          {selectedContact && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
              {selectedContact.email}
            </p>
          )}
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Urgency
          </label>
          <div className="flex gap-2">
            {(Object.keys(URGENCY_CLASSES) as Urgency[]).map((level) => {
              const cfg = URGENCY_CLASSES[level]
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all border ${urgency === level ? cfg.active : cfg.inactive}`}
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
            Deadline <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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

        {/* Scheduled start */}
        <div>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Start nagging from <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
            className="arlo-input"
            style={{ colorScheme: 'light dark' }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
            Leave blank to start immediately.
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-green px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-md text-sm font-semibold transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
