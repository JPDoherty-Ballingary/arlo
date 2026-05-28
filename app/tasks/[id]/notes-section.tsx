'use client'

import { useState } from 'react'

type Note = {
  id: string
  content: string
  created_at: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotesSection({
  taskId,
  initialNotes,
}: {
  taskId: string
  initialNotes: Note[]
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [adding, setAdding] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/tasks/${taskId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
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
    setAdding(false)
    setSaving(false)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Notes
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm font-medium transition-colors hover:underline"
            style={{ color: '#22d45f' }}
          >
            + Add note
          </button>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-faint)' }}>
        Internal only — never shown to recipient.
      </p>

      {adding && (
        <div
          className="rounded-lg p-4 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Add a note
          </label>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="arlo-input resize-none w-full mb-3"
            placeholder="Type your note here…"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
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
              onClick={() => { setAdding(false); setContent(''); setError(null) }}
              className="px-4 py-1.5 rounded-md text-sm transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)' }}>No notes yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-sm whitespace-pre-wrap mb-2"
                style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}
              >
                {note.content}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {formatDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
