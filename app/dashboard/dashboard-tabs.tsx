'use client'

import { useState } from 'react'
import Link from 'next/link'
import TaskCard from './task-card'
import { projectHex, projectBg } from '@/app/components/project-pill'

type Project = { id: string; name: string; color: string }

type Task = {
  id: string
  title: string
  recipient_email: string
  recipient_name: string | null
  urgency: 'low' | 'medium' | 'high'
  status: 'active' | 'paused'
  deadline: string | null
  nag_count: number
  last_nagged_at: string | null
  owner_notified_of_claim: boolean
  scheduled_start_at: string | null
  note_count: number
  project_id: string | null
}

export default function DashboardTabs({
  tasks,
  projects,
}: {
  tasks: Task[]
  projects: Project[]
}) {
  const [tab, setTab] = useState<'active' | 'paused'>('active')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  const active = tasks.filter((t) => t.status === 'active')
  const paused = tasks.filter((t) => t.status === 'paused')
  const tabTasks = tab === 'active' ? active : paused

  const shown = projectFilter
    ? tabTasks.filter((t) => t.project_id === projectFilter)
    : tabTasks

  // Only show projects that have at least one task (any status)
  const projectsWithTasks = projects.filter((p) =>
    tasks.some((t) => t.project_id === p.id)
  )

  function tabClass(selected: boolean) {
    return `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${selected ? 'btn-green' : ''}`
  }

  return (
    <div>
      {/* Project filter pills */}
      {projectsWithTasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setProjectFilter(null)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={
              projectFilter === null
                ? { background: 'var(--text-primary)', color: 'var(--bg)' }
                : { background: 'var(--border)', color: 'var(--text-muted)' }
            }
          >
            All
          </button>
          {projectsWithTasks.map((p) => {
            const active = projectFilter === p.id
            return (
              <button
                key={p.id}
                onClick={() => setProjectFilter(active ? null : p.id)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={
                  active
                    ? { background: projectHex(p.color), color: '#fff' }
                    : { background: projectBg(p.color), color: projectHex(p.color) }
                }
              >
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Active / Paused tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab('active')}
          className={tabClass(tab === 'active')}
          style={tab !== 'active' ? { color: 'var(--text-muted)' } : {}}
        >
          Active{active.length > 0 ? ` (${active.length})` : ''}
        </button>
        <button
          onClick={() => setTab('paused')}
          className={tabClass(tab === 'paused')}
          style={tab !== 'paused' ? { color: 'var(--text-muted)' } : {}}
        >
          Paused{paused.length > 0 ? ` (${paused.length})` : ''}
        </button>
      </div>

      {tab === 'active' && active.length === 0 ? (
        <EmptyState />
      ) : shown.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)' }}>
            {projectFilter ? 'No tasks in this project.' : 'No paused tasks.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              project={task.project_id ? projectMap[task.project_id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="rounded-lg p-10 text-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Arlo is ready.
      </h2>
      <p className="mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
        Add your first task manually or upload a meeting transcript and Arlo will extract the
        action items for you.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link href="/tasks/new" className="btn-green px-5 py-2.5 rounded-md font-semibold text-sm">
          Add a task manually →
        </Link>
        <Link
          href="/transcripts/new"
          className="btn-green-outline px-5 py-2.5 rounded-md font-semibold text-sm"
        >
          Upload a transcript →
        </Link>
      </div>
      <p className="mt-5 text-xs" style={{ color: 'var(--text-faint)' }}>
        Arlo will handle the chasing from here.
      </p>
    </div>
  )
}
