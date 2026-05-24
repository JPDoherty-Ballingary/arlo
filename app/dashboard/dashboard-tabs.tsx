'use client'

import { useState } from 'react'
import Link from 'next/link'
import TaskCard from './task-card'

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
}

export default function DashboardTabs({ tasks }: { tasks: Task[] }) {
  const [tab, setTab] = useState<'active' | 'paused'>('active')

  const active = tasks.filter((t) => t.status === 'active')
  const paused = tasks.filter((t) => t.status === 'paused')
  const shown = tab === 'active' ? active : paused

  function tabClass(selected: boolean) {
    return `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      selected ? 'btn-green' : ''
    }`
  }

  return (
    <div>
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
          <p style={{ color: 'var(--text-muted)' }}>No paused tasks.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((task) => (
            <TaskCard key={task.id} task={task} />
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
