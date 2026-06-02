'use client'

import { useState } from 'react'
import { PROJECT_COLORS, projectHex, projectBg } from '@/app/components/project-pill'

type Project = { id: string; name: string; color: string }
type TaskCount = Record<string, number>

export default function ProjectsClient({
  initialProjects,
  taskCounts,
}: {
  initialProjects: Project[]
  taskCounts: TaskCount
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [counts, setCounts] = useState<TaskCount>(taskCounts)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState('green')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('green')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [deleteError, setDeleteError] = useState<Record<string, string>>({})

  async function handleAdd() {
    if (!addName.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), color: addColor }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Failed to create'); return }
      setProjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setAddName('')
      setAddColor('green')
      setShowAdd(false)
    } finally {
      setAdding(false)
    }
  }

  function startEdit(p: Project) {
    setEditingId(p.id)
    setEditName(p.name)
    setEditColor(p.color)
    setEditError(null)
  }

  async function handleSave(id: string) {
    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Failed to save'); return }
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: data.name, color: data.color } : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteError((e) => ({ ...e, [id]: '' }))
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setDeleteError((e) => ({ ...e, [id]: data.error || 'Failed to delete' }))
      return
    }
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      {/* Project list */}
      {projects.length === 0 && !showAdd ? (
        <div
          className="rounded-lg p-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No projects yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-green px-5 py-2.5 rounded-md font-semibold text-sm"
          >
            Add your first project
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => {
            const taskCount = counts[p.id] ?? 0
            const isEditing = editingId === p.id
            const hex = projectHex(p.color)
            const bg = projectBg(p.color)

            return (
              <div
                key={p.id}
                className="rounded-lg p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(p.id) }}
                        className="arlo-input flex-1"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2.5">
                      {PROJECT_COLORS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setEditColor(c.key)}
                          title={c.key}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: c.hex,
                            opacity: editColor === c.key ? 1 : 0.4,
                            outline: editColor === c.key ? `2px solid ${c.hex}` : 'none',
                            outlineOffset: '2px',
                          }}
                        />
                      ))}
                    </div>
                    {editError && <p className="text-sm text-red-500">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(p.id)}
                        disabled={!editName.trim() || saving}
                        className="btn-green px-4 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 rounded-md text-sm font-semibold"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: hex }}
                      />
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: bg, color: hex }}
                      >
                        {taskCount} task{taskCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-sm transition-colors hover:underline"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-sm transition-colors hover:text-red-500"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {deleteError[p.id] && (
                  <p className="mt-2 text-xs text-red-500">{deleteError[p.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div
          className="mt-4 rounded-lg p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h3 className="font-semibold mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>
            New project
          </h3>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              className="arlo-input"
              placeholder="Project name"
              autoFocus
            />
            <div className="flex gap-2.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setAddColor(c.key)}
                  title={c.key}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c.hex,
                    opacity: addColor === c.key ? 1 : 0.4,
                    outline: addColor === c.key ? `2px solid ${c.hex}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!addName.trim() || adding}
                className="btn-green px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
              >
                {adding ? 'Saving…' : 'Save project'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddName(''); setAddColor('green') }}
                className="px-5 py-2 rounded-md text-sm font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        projects.length > 0 && (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 btn-green px-4 py-2 rounded-md text-sm font-semibold"
          >
            + Add project
          </button>
        )
      )}
    </div>
  )
}
