import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/app-nav'
import AgendaClient from './agenda-client'

export const metadata: Metadata = { title: 'Agenda' }

export default async function AgendaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: agendas }, { data: recipients }] = await Promise.all([
    supabase
      .from('agendas')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('recipients')
      .select('email, name')
      .eq('owner_id', user.id)
      .order('name', { ascending: true, nullsFirst: false }),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />
      <AgendaClient
        initialAgendas={agendas ?? []}
        recipients={(recipients ?? []) as { email: string; name: string | null }[]}
      />
    </div>
  )
}
