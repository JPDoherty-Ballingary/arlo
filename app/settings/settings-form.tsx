'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'


const FREQUENCY_OPTIONS = [
  { label: 'Every 4 hours', value: 4 },
  { label: 'Every 8 hours', value: 8 },
  { label: 'Twice a day', value: 12 },
  { label: 'Once a day', value: 24 },
  { label: 'Every 2 days', value: 48 },
  { label: 'Once a week', value: 168 },
]

type Profile = {
  display_name: string | null
  default_frequency_hours: number | null
  default_urgency: string | null
  microsoft_access_token: string | null
  microsoft_email: string | null
}

export default function SettingsForm({
  userId,
  userEmail,
  profile,
  outlookJustConnected,
}: {
  userId: string
  userEmail: string
  profile: Profile | null
  outlookJustConnected: boolean
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [frequency, setFrequency] = useState(profile?.default_frequency_hours ?? 24)
  const [urgency, setUrgency] = useState(profile?.default_urgency ?? 'medium')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: displayName.trim() || null,
      default_frequency_hours: frequency,
      default_urgency: urgency,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleDisconnectOutlook() {
    setDisconnecting(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({
        microsoft_access_token: null,
        microsoft_refresh_token: null,
        microsoft_token_expiry: null,
        microsoft_email: null,
      })
      .eq('id', userId)
    router.refresh()
    setDisconnecting(false)
  }

  const showNamePrompt = !profile?.display_name && !displayName.trim()
  const isOutlookConnected = !!profile?.microsoft_access_token

  return (
    <div className="flex flex-col gap-10">
      {outlookJustConnected && (
        <div
          className="px-4 py-3 rounded-md text-sm font-medium"
          style={{ background: 'rgba(34,212,95,0.12)', color: '#22d45f', border: '1px solid rgba(34,212,95,0.25)' }}
        >
          Outlook connected successfully.
        </div>
      )}

      {/* Profile section */}
      <section>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Profile
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Used in emails Arlo sends on your behalf.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="arlo-input max-w-sm"
              placeholder="e.g. James"
            />
            {showNamePrompt && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                Add your name so Arlo knows how to sign off emails.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="arlo-input max-w-sm opacity-60 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
              Email cannot be changed here.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Defaults section */}
      <section>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Defaults
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Pre-filled when you create a new task.
        </p>

        <div className="flex flex-col gap-4 max-w-sm">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Default nag frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value, 10))}
              className="arlo-input"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Default urgency
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="arlo-input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-green px-6 py-2.5 rounded-md font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && (
          <p className="text-sm" style={{ color: '#22d45f' }}>
            Saved.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Integrations section */}
      <section>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Integrations
        </h2>

        <div
          className="mt-5 p-5 rounded-lg flex items-start justify-between gap-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Outlook Calendar
            </p>
            {isOutlookConnected ? (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(34,212,95,0.12)', color: '#22d45f' }}
                >
                  Connected
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {profile?.microsoft_email}
                </span>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Connect your Outlook calendar so Arlo can pull upcoming meetings into your agenda.
              </p>
            )}
          </div>

          {isOutlookConnected ? (
            <button
              type="button"
              onClick={handleDisconnectOutlook}
              disabled={disconnecting}
              className="shrink-0 text-sm px-4 py-2 rounded-md disabled:opacity-50"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/auth/outlook"
              className="shrink-0 btn-green text-sm px-4 py-2 rounded-md font-medium"
            >
              Connect Outlook →
            </a>
          )}
        </div>
      </section>
    </div>
  )
}
