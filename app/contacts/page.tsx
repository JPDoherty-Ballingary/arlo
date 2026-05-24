import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/app-nav'
import ContactsClient from './contacts-client'

export const metadata: Metadata = { title: 'Contacts' }

export default async function ContactsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: recipients }, { data: activeTasks }, { data: profile }] = await Promise.all([
    supabase
      .from('recipients')
      .select('*')
      .eq('owner_id', user.id)
      .order('name', { ascending: true, nullsFirst: false }),
    supabase
      .from('tasks')
      .select('recipient_email')
      .eq('owner_id', user.id)
      .eq('status', 'active'),
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ])

  const activeCountByEmail: Record<string, number> = {}
  for (const t of activeTasks ?? []) {
    activeCountByEmail[t.recipient_email] = (activeCountByEmail[t.recipient_email] ?? 0) + 1
  }

  const contacts = (recipients ?? []).map((r) => ({
    ...r,
    active_task_count: activeCountByEmail[r.email] ?? 0,
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />
      <ContactsClient
        initialContacts={contacts}
        ownerDisplayName={profile?.display_name ?? ''}
      />
    </div>
  )
}
