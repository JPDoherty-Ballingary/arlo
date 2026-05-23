import Link from 'next/link'
import RollingAcronym from './components/rolling-acronym'

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen text-white" style={{ background: '#0a0a0a' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className="text-7xl sm:text-8xl font-bold"
          style={{ letterSpacing: '-0.04em' }}
        >
          ARLO
        </h1>

        <div className="mt-3 w-full max-w-lg">
          <RollingAcronym />
        </div>

        <p className="mt-2 text-sm" style={{ color: '#888888' }}>
          (we&apos;re still deciding)
        </p>

        <p className="mt-8 text-base sm:text-lg max-w-md" style={{ color: '#ffffff' }}>
          Arlo is your Automated Relentless Loop Operator. Feed him your action
          items. He&apos;ll handle the rest.
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

      <footer className="py-6 text-center text-xs" style={{ color: '#888888' }}>
        ARLO — Automated Relentless Loop Operator
      </footer>
    </main>
  )
}
