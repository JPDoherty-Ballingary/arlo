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

  const [{ data: agendas }, { data: recipients }, { data: projects }, { data: profile }] =
    await Promise.all([
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
      supabase
        .from('projects')
        .select('id, name, color')
        .eq('owner_id', user.id)
        .order('name', { ascending: true }),
      supabase
        .from('profiles')
        .select('microsoft_access_token')
        .eq('id', user.id)
        .maybeSingle(),
    ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />
      <AgendaClient
        initialAgendas={agendas ?? []}
        recipients={(recipients ?? []) as { email: string; name: string | null }[]}
        projects={(projects ?? []) as { id: string; name: string; color: string }[]}
        hasOutlook={!!profile?.microsoft_access_token}
      />
    </div>
  )
}
