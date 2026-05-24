import Link from 'next/link'
import RollingAcronym from './components/rolling-acronym'
import ThemeToggle from './components/theme-toggle'
import Logo from './components/logo'

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav className="px-6 py-4 flex justify-end">
        <ThemeToggle />
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Logo className="h-20 sm:h-24 w-auto" />

        <div className="mt-3 w-full max-w-lg">
          <RollingAcronym />
        </div>

        <p className="mt-2 text-sm" style={{ color: 'var(--text-faint)' }}>
          (we&apos;re still deciding)
        </p>

        <p className="mt-8 text-base sm:text-lg max-w-md" style={{ color: 'var(--text-primary)' }}>
          Arlo keeps your team accountable. Add action items from your meetings
          — he&apos;ll follow up by email until they&apos;re done.
        </p>

        <div className="mt-8 flex gap-4">
          <Link href="/signup" className="btn-green px-6 py-3 font-semibold rounded-md">
            Sign up
          </Link>
          <Link href="/login" className="btn-green-outline px-6 py-3 font-semibold rounded-md">
            Log in
          </Link>
        </div>
      </div>

      <footer className="py-6 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
        <a
          href="https://deliberatelysimple.digital"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-faint)', textDecoration: 'underline' }}
        >
          A Deliberately Simple tool.
        </a>
      </footer>
    </main>
  )
}
