import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/app-nav'
import SettingsForm from './settings-form'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ outlook?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, params] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'display_name, default_frequency_hours, default_urgency, microsoft_access_token, microsoft_email'
      )
      .eq('id', user.id)
      .maybeSingle(),
    searchParams,
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>

        <SettingsForm
          userId={user.id}
          userEmail={user.email ?? ''}
          profile={profile}
          outlookJustConnected={params.outlook === 'connected'}
        />
      </main>
    </div>
  )
}
