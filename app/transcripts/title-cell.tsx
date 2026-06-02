'use client'

import { useState, useRef, useEffect } from 'react'

export default function TranscriptTitleCell({
  transcriptId,
  title,
}: {
  transcriptId: string
  title: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title || '')
  const [saving, setSaving] = useState(false)
  const [displayTitle, setDisplayTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function save() {
    const trimmed = value.trim()
    if (!trimmed) {
      setValue(displayTitle || '')
      setEditing(false)
      return
    }
    setSaving(true)
    await fetch(`/api/transcripts/${transcriptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
    setDisplayTitle(trimmed)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') {
            setValue(displayTitle || '')
            setEditing(false)
          }
        }}
        disabled={saving}
        className="arlo-input text-sm font-medium w-full"
        style={{ padding: '2px 6px' }}
      />
    )
  }

  if (displayTitle) {
    return (
      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
        {displayTitle}
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 group"
    >
      <span className="font-medium" style={{ color: 'var(--text-faint)' }}>
        Unnamed meeting
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-faint)' }}
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  )
}
