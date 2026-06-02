import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/app-nav'
import ProjectsClient from './projects-client'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: projects }, { data: taskRows }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, color')
      .eq('owner_id', user.id)
      .order('name', { ascending: true }),
    supabase
      .from('tasks')
      .select('project_id')
      .eq('owner_id', user.id)
      .in('status', ['active', 'paused'])
      .not('project_id', 'is', null),
  ])

  const taskCounts: Record<string, number> = {}
  for (const row of taskRows ?? []) {
    if (row.project_id) taskCounts[row.project_id] = (taskCounts[row.project_id] ?? 0) + 1
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          Projects
        </h1>
        <ProjectsClient
          initialProjects={projects ?? []}
          taskCounts={taskCounts}
        />
      </main>
    </div>
  )
}
