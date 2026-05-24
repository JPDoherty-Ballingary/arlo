import Link from 'next/link'
import RollingAcronym from './components/rolling-acronym'
import ThemeToggle from './components/theme-toggle'
import Logo from './components/logo'

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Nav */}
      <nav
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xl font-bold tracking-wide" style={{ color: '#22d45f' }}>ARLO</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn-green-outline px-4 py-2 text-sm font-semibold rounded-md">
            Log in
          </Link>
          <Link href="/signup" className="btn-green px-4 py-2 text-sm font-semibold rounded-md">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <Logo className="h-20 sm:h-24 w-auto" />
        <div className="mt-3 w-full max-w-lg">
          <RollingAcronym />
        </div>
        <p className="mt-6 text-xl sm:text-2xl font-medium max-w-xl" style={{ color: 'var(--text-primary)' }}>
          ARLO chases people so you don&apos;t have to.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/signup" className="btn-green px-6 py-3 font-semibold rounded-md">
            Sign up
          </Link>
          <Link href="/login" className="btn-green-outline px-6 py-3 font-semibold rounded-md">
            Log in
          </Link>
        </div>
      </section>

      {/* Section 1: How it works */}
      <section className="px-6 py-20" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16" style={{ color: 'var(--text-primary)' }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col">
              <span className="text-5xl font-bold mb-4" style={{ color: '#22d45f' }}>1</span>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Add a task</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Assign it to someone, set a deadline, choose how often you want them reminded.
              </p>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-bold mb-4" style={{ color: '#22d45f' }}>2</span>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>ARLO chases them</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                He emails them on schedule. Starts friendly. Gets firmer. Doesn&apos;t stop.
              </p>
            </div>
            <div className="flex flex-col">
              <span className="text-5xl font-bold mb-4" style={{ color: '#22d45f' }}>3</span>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>You decide when it&apos;s done</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                They can say they&apos;ve done it. You confirm it. Until you do, ARLO keeps going.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: What ARLO does */}
      <section className="px-6 py-20" style={{ background: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16" style={{ color: 'var(--text-primary)' }}>
            What ARLO does
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-3xl mb-3">🔁</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>He doesn&apos;t stop</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                ARLO doesn&apos;t forget, get tired, or feel awkward about following up. He just keeps going until you say otherwise.
              </p>
            </div>
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Paste a transcript, get a to-do list
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Drop in a meeting transcript and ARLO pulls out every action item automatically. No manual entry.
              </p>
            </div>
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Reliability scoring</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Every person ARLO chases gets a score over time. See exactly who delivers and who just says they will.
              </p>
            </div>
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Honest about being a bot</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Every email is signed by ARLO. No pretending to be human. Just a professional agent doing his job.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Who uses ARLO */}
      <section className="px-6 py-20" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16" style={{ color: 'var(--text-primary)' }}>
            Who uses ARLO
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Managing up</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Sometimes the people above you are the hardest to chase. ARLO keeps things moving professionally, without the awkward conversation.
              </p>
            </div>
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Chasing clients</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Waiting on copy, approvals, or invoices. ARLO follows up professionally so you don&apos;t have to.
              </p>
            </div>
            <div
              className="p-6 rounded-lg"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Running a team</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Assign tasks, set deadlines, let ARLO handle the accountability. You focus on the work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Stats */}
      <section className="px-6 py-20" style={{ background: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-6xl font-bold" style={{ color: '#22d45f' }}>0</div>
              <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                awkward follow-ups sent by humans
              </div>
            </div>
            <div>
              <div className="text-6xl font-bold" style={{ color: '#22d45f' }}>∞</div>
              <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                reminders ARLO is prepared to send
              </div>
            </div>
            <div>
              <div className="text-6xl font-bold" style={{ color: '#22d45f' }}>100%</div>
              <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                your call when something is done
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Bottom CTA */}
      <section className="px-6 py-24 text-center" style={{ background: 'var(--surface)' }}>
        <h2 className="text-4xl sm:text-5xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
          Stop chasing. Start ARLO.
        </h2>
        <Link href="/signup" className="btn-green px-8 py-4 text-lg font-semibold rounded-md inline-block">
          Sign up
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-5 flex items-center justify-between border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-bold tracking-wide" style={{ color: '#22d45f' }}>ARLO</span>
        <span className="text-sm" style={{ color: 'var(--text-faint)' }}>agent-arlo.com</span>
      </footer>

    </main>
  )
}
