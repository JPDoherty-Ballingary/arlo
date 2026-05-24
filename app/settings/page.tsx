import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/app/components/theme-toggle'
import Logo from '@/app/components/logo'
import SignOutButton from '@/app/dashboard/sign-out-button'
import SettingsForm from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, default_frequency_hours, default_urgency, webhook_token')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/dashboard">
          <Logo className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Dashboard
          </Link>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>

        <SettingsForm
          userId={user.id}
          userEmail={user.email ?? ''}
          profile={profile}
          webhookToken={profile?.webhook_token ?? null}
        />
      </main>
    </div>
  )
}
