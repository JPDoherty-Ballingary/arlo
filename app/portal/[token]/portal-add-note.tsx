'use client'

import { useState } from 'react'

export default function PortalAddNote({
  taskId,
  portalToken,
}: {
  taskId: string
  portalToken: string
}) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

    setContent('')
    setOpen(false)
    setSaved(true)
    setSaving(false)
  }

  if (saved) {
    return (
      <p className="text-xs font-medium mt-3" style={{ color: '#22d45f' }}>
        Note added.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs mt-3 transition-colors hover:underline"
        style={{ color: 'var(--text-faint)' }}
      >
        + Add a note
      </button>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
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
  )
}
