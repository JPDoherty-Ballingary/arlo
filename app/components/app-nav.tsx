'use client'

import Link from 'next/link'
import Logo from './logo'
import ThemeToggle from './theme-toggle'
import SignOutButton from '@/app/dashboard/sign-out-button'

export default function AppNav({ userEmail }: { userEmail?: string }) {
  return (
    <nav
      className="px-6 py-4 flex items-center justify-between"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
    >
      <Link href="/dashboard">
        <Logo className="h-8 w-auto" />
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          Dashboard
        </Link>
        <Link href="/contacts" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          Contacts
        </Link>
        <Link href="/transcripts" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          Transcripts
        </Link>
        <Link href="/tasks/new" className="btn-green px-3 py-1.5 text-sm font-semibold rounded-md">
          New task
        </Link>
        <Link href="/settings" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          Settings
        </Link>
        <ThemeToggle />
        {userEmail && (
          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            {userEmail}
          </span>
        )}
        <SignOutButton />
      </div>
    </nav>
  )
}
