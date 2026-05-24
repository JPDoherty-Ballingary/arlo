'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Contact = {
  id: string
  email: string
  name: string | null
  notes: string | null
  reliability_score: number | null
  tasks_completed: number
  total_tasks: number
  intro_email_sent: boolean
  intro_email_sent_at: string | null
  intro_email_scheduled_at: string | null
  active_task_count: number
}

type Props = {
  initialContacts: Contact[]
  ownerDisplayName: string
}

function scoreColor(score: number): string {
  if (score >= 8) return '#22d45f'
  if (score >= 5) return '#f59e0b'
  return '#ef4444'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildIntroBody(contactName: string | null, ownerDisplayName: string): string {
  const name = contactName || 'there'
  const owner = ownerDisplayName || 'Your contact'
  return `Hi ${name},

I wanted to give you a heads up — I've started using an AI agent called ARLO to help manage tasks and follow-ups.

ARLO is an automated system, not a person. When I assign a task to you through ARLO, he'll send you a reminder email on a schedule I set until the task is marked as complete. He's persistent by design — that's the point.

This isn't about micromanaging. It's about making sure nothing falls through the cracks on either side. You'll always know exactly what's outstanding, and so will I.

If you ever want to stop receiving reminders for a specific task, there'll be an unsubscribe link in every email.

Any questions, just reply to this email — it'll come to me, not ARLO.

${owner}`
}

// ─── Shared primitives ──────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl flex flex-col gap-5 p-6 max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ─── Contact Card ────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onEdit,
  onIntroduce,
  onEditScheduled,
}: {
  contact: Contact
  onEdit: () => void
  onIntroduce: () => void
  onEditScheduled: () => void
}) {
  const hasScore = contact.total_tasks > 0 && contact.reliability_score !== null
  const isScheduledPending =
    !contact.intro_email_sent &&
    !!contact.intro_email_scheduled_at &&
    new Date(contact.intro_email_scheduled_at) > new Date()

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Name / email / score row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {contact.name || contact.email}
          </p>
          {contact.name && (
            <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
              {contact.email}
            </p>
          )}
        </div>

        {hasScore ? (
          <span
            className="text-sm font-bold shrink-0 mt-0.5"
            style={{ color: scoreColor(contact.reliability_score!) }}
          >
            {contact.reliability_score!.toFixed(1)}
            <span className="text-xs font-normal" style={{ color: 'var(--text-faint)' }}>
              /10
            </span>
          </span>
        ) : (
          <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--text-faint)' }}>
            No tasks yet
          </span>
        )}
      </div>

      {/* Active task count */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {contact.active_task_count === 0
          ? 'No active tasks'
          : `${contact.active_task_count} active task${contact.active_task_count === 1 ? '' : 's'}`}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {contact.intro_email_sent ? (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Intro sent{contact.intro_email_sent_at ? ` ${fmtDate(contact.intro_email_sent_at)}` : ''}
          </span>
        ) : isScheduledPending ? (
          <>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: '#451a03', color: '#f59e0b', border: '1px solid #92400e' }}
            >
              Scheduled {fmtDateTime(contact.intro_email_scheduled_at!)}
            </span>
            <button
              onClick={onEditScheduled}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
            >
              Edit
            </button>
          </>
        ) : (
          <button
            onClick={onIntroduce}
            className="btn-green px-3 py-1.5 rounded-md text-xs font-semibold"
          >
            Introduce ARLO
          </button>
        )}
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            background: 'transparent',
          }}
        >
          Edit
        </button>
      </div>
    </div>
  )
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────

function AddContactModal({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: (contact: Contact) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim(), notes: notes.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      onAdded(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add contact" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="arlo-input"
            placeholder="e.g. Sarah Jones"
            autoFocus
          />
        </Field>
        <Field label="Email *">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="arlo-input"
            placeholder="sarah@example.com"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </Field>
        <Field label="Notes" hint="Internal only — never shown to the recipient">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="arlo-input resize-none"
            rows={3}
            placeholder="Optional notes…"
          />
        </Field>
        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-green px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Edit Contact Modal ───────────────────────────────────────────────────────

function EditContactModal({
  contact,
  onClose,
  onUpdated,
}: {
  contact: Contact
  onClose: () => void
  onUpdated: (updated: Contact) => void
}) {
  const [name, setName] = useState(contact.name ?? '')
  const [email, setEmail] = useState(contact.email)
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim(), notes: notes.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      onUpdated({ ...contact, ...data })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit contact" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="arlo-input"
            placeholder="e.g. Sarah Jones"
            autoFocus
          />
        </Field>
        <Field label="Email *">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="arlo-input"
          />
        </Field>
        <Field label="Notes" hint="Internal only — never shown to the recipient">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="arlo-input resize-none"
            rows={3}
            placeholder="Optional notes…"
          />
        </Field>
        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-green px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Introduce Modal ──────────────────────────────────────────────────────────

function IntroduceModal({
  contact,
  ownerDisplayName,
  onClose,
  onSent,
  onScheduled,
}: {
  contact: Contact
  ownerDisplayName: string
  onClose: () => void
  onSent: (sentAt: string) => void
  onScheduled: (sendAt: string) => void
}) {
  const [subject, setSubject] = useState('Meet ARLO — your new accountability partner')
  const [body, setBody] = useState(() => buildIntroBody(contact.name, ownerDisplayName))
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16)

  async function send(sendAt: string | null) {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/introduce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, sendAt }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        return
      }
      if (data.scheduled) {
        onScheduled(data.send_at)
      } else {
        onSent(data.sent_at)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title={`Introduce ARLO to ${contact.name || contact.email}`}
      onClose={onClose}
      wide
    >
      <div className="flex flex-col gap-4">
        <Field label="Subject">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="arlo-input"
          />
        </Field>

        <Field label="Message">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="arlo-input resize-y"
            style={{
              fontFamily: 'ui-monospace, "Courier New", Courier, monospace',
              fontSize: '13px',
              lineHeight: '1.75',
              minHeight: '340px',
            }}
          />
        </Field>

        {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

        {showSchedule ? (
          <div className="flex flex-col gap-3">
            <Field label="Send at">
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                min={minDateTime}
                className="arlo-input"
                style={{ colorScheme: 'light dark' }}
                autoFocus
              />
            </Field>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSchedule(false)}
                className="px-4 py-2 rounded-md text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel schedule
              </button>
              <button
                onClick={() => send(scheduleAt || null)}
                disabled={sending || !scheduleAt}
                className="btn-green-outline px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
              >
                {sending ? 'Scheduling…' : 'Schedule send'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSchedule(true)}
              className="btn-green-outline px-5 py-2 rounded-md font-semibold text-sm"
            >
              Schedule
            </button>
            <button
              onClick={() => send(null)}
              disabled={sending}
              className="btn-green px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send now'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Edit Scheduled Intro Modal ───────────────────────────────────────────────

function EditScheduledIntroModal({
  contact,
  ownerDisplayName,
  onClose,
  onSent,
  onRescheduled,
}: {
  contact: Contact
  ownerDisplayName: string
  onClose: () => void
  onSent: (sentAt: string) => void
  onRescheduled: (sendAt: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('Meet ARLO — your new accountability partner')
  const [body, setBody] = useState(() => buildIntroBody(contact.name, ownerDisplayName))
  const [scheduleAt, setScheduleAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16)

  useEffect(() => {
    fetch(`/api/contacts/${contact.id}/scheduled-intro`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.subject) setSubject(data.subject)
        if (data?.body_text) setBody(data.body_text)
        if (data?.send_at) setScheduleAt(new Date(data.send_at).toISOString().slice(0, 16))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [contact.id])

  async function submit(sendNow: boolean) {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required')
      return
    }
    if (!sendNow && !scheduleAt) {
      setError('Please set a send time')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/introduce`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, sendAt: sendNow ? null : scheduleAt }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      if (data.scheduled) {
        onRescheduled(data.send_at)
      } else {
        onSent(data.sent_at)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Edit scheduled intro — ${contact.name || contact.email}`}
      onClose={onClose}
      wide
    >
      {loading ? (
        <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="arlo-input"
              autoFocus
            />
          </Field>

          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="arlo-input resize-y"
              style={{
                fontFamily: 'ui-monospace, "Courier New", Courier, monospace',
                fontSize: '13px',
                lineHeight: '1.75',
                minHeight: '280px',
              }}
            />
          </Field>

          <Field label="Send at">
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              min={minDateTime}
              className="arlo-input"
              style={{ colorScheme: 'light dark' }}
            />
          </Field>

          {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-3 justify-end pt-1 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => submit(true)}
              disabled={saving}
              className="btn-green-outline px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Sending…' : 'Send now'}
            </button>
            <button
              onClick={() => submit(false)}
              disabled={saving || !scheduleAt}
              className="btn-green px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update schedule'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactsClient({ initialContacts, ownerDisplayName }: Props) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [showAdd, setShowAdd] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [introduceContact, setIntroduceContact] = useState<Contact | null>(null)
  const [editScheduledContact, setEditScheduledContact] = useState<Contact | null>(null)

  function handleContactAdded(contact: Contact) {
    setContacts((prev) => [...prev, contact].sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email)))
    setShowAdd(false)
  }

  function handleContactUpdated(updated: Contact) {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
    setEditContact(null)
  }

  function markIntroSent(contactId: string, sentAt: string) {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, intro_email_sent: true, intro_email_sent_at: sentAt, intro_email_scheduled_at: null }
          : c
      )
    )
  }

  function markIntroScheduled(contactId: string, sendAt: string) {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, intro_email_scheduled_at: sendAt } : c
      )
    )
  }

  return (
    <>
      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Contacts
          </h1>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-green px-4 py-2 text-sm font-semibold rounded-md"
          >
            Add contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div
            className="rounded-lg p-10 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              No contacts yet.
            </h2>
            <p className="mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              Add someone to track their tasks and introduce them to ARLO.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="btn-green px-5 py-2.5 rounded-md font-semibold text-sm"
            >
              Add your first contact →
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => setEditContact(contact)}
                onIntroduce={() => setIntroduceContact(contact)}
                onEditScheduled={() => setEditScheduledContact(contact)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdd && (
        <AddContactModal onClose={() => setShowAdd(false)} onAdded={handleContactAdded} />
      )}
      {editContact && (
        <EditContactModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onUpdated={handleContactUpdated}
        />
      )}
      {introduceContact && (
        <IntroduceModal
          contact={introduceContact}
          ownerDisplayName={ownerDisplayName}
          onClose={() => setIntroduceContact(null)}
          onSent={(sentAt) => { markIntroSent(introduceContact.id, sentAt); setIntroduceContact(null) }}
          onScheduled={(sendAt) => { markIntroScheduled(introduceContact.id, sendAt); setIntroduceContact(null) }}
        />
      )}
      {editScheduledContact && (
        <EditScheduledIntroModal
          contact={editScheduledContact}
          ownerDisplayName={ownerDisplayName}
          onClose={() => setEditScheduledContact(null)}
          onSent={(sentAt) => { markIntroSent(editScheduledContact.id, sentAt); setEditScheduledContact(null) }}
          onRescheduled={(sendAt) => { markIntroScheduled(editScheduledContact.id, sendAt); setEditScheduledContact(null) }}
        />
      )}
    </>
  )
}
