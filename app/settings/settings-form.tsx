'use client'

import { useState } from 'react'
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
}

export default function SettingsForm({
  userId,
  userEmail,
  profile,
  webhookToken,
}: {
  userId: string
  userEmail: string
  profile: Profile | null
  webhookToken: string | null
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [frequency, setFrequency] = useState(profile?.default_frequency_hours ?? 24)
  const [urgency, setUrgency] = useState(profile?.default_urgency ?? 'medium')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const webhookUrl = webhookToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/fireflies?token=${webhookToken}`
    : null

  function handleCopy() {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

  const showNamePrompt = !profile?.display_name && !displayName.trim()

  return (
    <div className="flex flex-col gap-10">
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

      {/* Integrations section */}
      <section>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Integrations
        </h2>

        <div
          className="rounded-lg p-5 mt-4"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            Fireflies.ai
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Connect Fireflies to automatically import meeting transcripts into Arlo. No manual
            pasting required.
          </p>

          {webhookUrl ? (
            <>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Your personal webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="arlo-input text-xs font-mono flex-1 cursor-text select-all"
                  style={{ color: 'var(--text-faint)' }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-green px-4 py-2 rounded-md text-sm font-semibold shrink-0 transition-all"
                  style={{ minWidth: 90 }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <ol className="mt-5 flex flex-col gap-1.5 list-decimal list-inside">
                {[
                  'Copy your webhook URL above',
                  'Go to fireflies.ai → Settings → Webhooks',
                  'Add a new webhook and paste your URL',
                  'Select trigger: "Transcription complete"',
                  'Save — Arlo will now automatically receive your meeting transcripts',
                ].map((step, i) => (
                  <li key={i} className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Webhook URL not available — try refreshing the page.
            </p>
          )}
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
    </div>
  )
}
