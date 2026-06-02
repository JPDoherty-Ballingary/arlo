'use client'

import { useState } from 'react'
import { PROJECT_COLORS, projectHex } from './project-pill'

export type Project = { id: string; name: string; color: string }

export default function ProjectSelect({
  projects,
  value,
  onChange,
  onProjectCreated,
}: {
  projects: Project[]
  value: string | null
  onChange: (id: string | null) => void
  onProjectCreated?: (project: Project) => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('green')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Failed to create'); return }
      onProjectCreated?.(data)
      onChange(data.id)
      setShowModal(false)
      setNewName('')
      setNewColor('green')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="arlo-input"
      >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-1 text-xs hover:underline"
        style={{ color: 'var(--text-faint)' }}
      >
        + New project
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-sm rounded-lg p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              New project
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Project name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  className="arlo-input"
                  placeholder="e.g. Q3 Finance Review"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Color</label>
                <div className="flex gap-2.5">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setNewColor(c.key)}
                      title={c.key}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c.hex,
                        opacity: newColor === c.key ? 1 : 0.4,
                        outline: newColor === c.key ? `2px solid ${c.hex}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="btn-green flex-1 py-2 rounded-md font-semibold text-sm disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create project'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setNewName(''); setNewColor('green') }}
                  className="flex-1 py-2 rounded-md text-sm font-semibold"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
