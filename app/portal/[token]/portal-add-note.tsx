'use client'

import { useState } from 'react'

type Note = {
  id: string
  content: string
  created_at: string
  author_email: string | null
}

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PortalAddNote({
  taskId,
  portalToken,
  initialNotes,
}: {
  taskId: string
  portalToken: string
  initialNotes: Note[]
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/portal/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portalToken, taskId, content }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save note')
      setSaving(false)
      return
    }

    const note = await res.json()
    setNotes((prev) => [...prev, note])
    setContent('')
    setOpen(false)
    setSaving(false)
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-faint)' }}>
        Notes
      </p>

      {notes.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-md px-3 py-2 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <p className="whitespace-pre-wrap mb-1" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {note.content}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {note.author_email && <span>{note.author_email} · </span>}
                {formatNoteDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div className="flex flex-col gap-2">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="arlo-input resize-none w-full text-sm"
            placeholder="Add a note for the task owner…"
            autoFocus
          />
          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="btn-green px-4 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setContent(''); setError(null) }}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs transition-colors hover:underline"
          style={{ color: 'var(--text-faint)' }}
        >
          + Add a note
        </button>
      )}
    </div>
  )
}
