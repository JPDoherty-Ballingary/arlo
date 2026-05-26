'use client'

import { useState, useRef } from 'react'

type AgendaItem = {
  text: string
  owner: string | null
  urgency: 'high' | 'medium' | 'low' | null
  note: string | null
}

type AgendaSection = {
  heading: string
  items: AgendaItem[]
}

type AgendaContent = {
  title: string
  date: string
  summary: string
  sections: AgendaSection[]
}

type Agenda = {
  id: string
  title: string
  meeting_date: string
  attendee_emails: string[]
  content: AgendaContent
  sent_at: string | null
  sent_to: string[] | null
  created_at: string
}

type Props = {
  initialAgendas: Agenda[]
  recipients: { email: string; name: string | null }[]
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AgendaItemRow({ item }: { item: AgendaItem }) {
  const borderColor =
    item.urgency === 'high' ? '#ef4444' : item.urgency === 'medium' ? '#f59e0b' : 'transparent'
  const bg =
    item.urgency === 'high'
      ? 'rgba(239,68,68,0.05)'
      : item.urgency === 'medium'
      ? 'rgba(245,158,11,0.05)'
      : 'var(--bg)'

  return (
    <div
      className="pl-3 py-2 pr-3 rounded"
      style={{ borderLeft: `3px solid ${borderColor}`, background: bg }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {item.text}
        </span>
        {item.owner && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          >
            {item.owner}
          </span>
        )}
        {item.urgency && item.urgency !== 'low' && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              background:
                item.urgency === 'high' ? 'var(--badge-high-bg)' : 'var(--badge-medium-bg)',
              color:
                item.urgency === 'high' ? 'var(--badge-high-color)' : 'var(--badge-medium-color)',
            }}
          >
            {item.urgency}
          </span>
        )}
      </div>
      {item.note && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
          {item.note}
        </p>
      )}
    </div>
  )
}

function AgendaPreview({
  agenda,
  onSend,
  onPrint,
  sending,
}: {
  agenda: Agenda
  onSend: () => void
  onPrint: () => void
  sending: boolean
}) {
  const content = agenda.content

  return (
    <div>
      <div className="flex items-center justify-between mb-4 no-print">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Agenda preview
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onPrint}
            className="btn-green-outline px-4 py-1.5 text-sm font-medium rounded-md"
          >
            Print / PDF
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="btn-green px-4 py-1.5 text-sm font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : agenda.sent_at ? 'Resend to attendees' : 'Send to attendees'}
          </button>
        </div>
      </div>

      <div
        id="agenda-print-target"
        className="rounded-lg p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {content.title}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {content.date}
        </p>

        {content.summary && (
          <div
            className="rounded p-4 mb-8 text-sm leading-relaxed"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {content.summary}
          </div>
        )}

        <div className="space-y-8">
          {content.sections.map((section, si) => (
            <div key={si}>
              <h3
                className="text-xs font-bold uppercase tracking-widest pb-2 mb-3"
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
              >
                {section.heading}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, ii) => (
                  <AgendaItemRow key={ii} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {agenda.sent_at && (
          <p className="mt-8 text-xs" style={{ color: 'var(--text-faint)' }}>
            Sent to {agenda.sent_to?.join(', ')} on {fmtDateTime(agenda.sent_at)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AgendaClient({ initialAgendas, recipients }: Props) {
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas)
  const [currentAgenda, setCurrentAgenda] = useState<Agenda | null>(initialAgendas[0] ?? null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('Weekly Ops Meeting')
  const [meetingDate, setMeetingDate] = useState('')
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')

  const previewRef = useRef<HTMLDivElement>(null)

  function addEmail(email: string) {
    const normalized = email.trim().toLowerCase()
    if (normalized && !attendeeEmails.includes(normalized)) {
      setAttendeeEmails((prev) => [...prev, normalized])
    }
    setEmailInput('')
  }

  function removeEmail(email: string) {
    setAttendeeEmails((prev) => prev.filter((e) => e !== email))
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (emailInput) addEmail(emailInput)
    } else if (e.key === 'Backspace' && !emailInput && attendeeEmails.length > 0) {
      setAttendeeEmails((prev) => prev.slice(0, -1))
    }
  }

  async function handleGenerate() {
    if (!title.trim() || !meetingDate) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/agenda/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, meetingDate, attendeeEmails }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate agenda')
        return
      }
      const agenda: Agenda = data
      setAgendas((prev) => [agenda, ...prev])
      setCurrentAgenda(agenda)
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Failed to generate agenda')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    if (!currentAgenda) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/agenda/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendaId: currentAgenda.id, attendeeEmails }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send agenda')
        return
      }
      const updated: Agenda = data
      setCurrentAgenda(updated)
      setAgendas((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch {
      setError('Failed to send agenda')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #agenda-print-target, #agenda-print-target * { visibility: visible; }
          #agenda-print-target { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; box-sizing: border-box; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Generate form */}
      <div className="no-print mb-10">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Agenda
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Generate a structured meeting agenda from your outstanding tasks.
        </p>

        <div
          className="p-6 rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="grid gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Meeting title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="arlo-input"
                placeholder="Weekly Ops Meeting"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Meeting date and time
              </label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="arlo-input"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Attendee emails
              </label>
              <div
                className="min-h-[42px] flex flex-wrap gap-1.5 p-2 rounded-md cursor-text"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                onClick={() => document.getElementById('email-tag-input')?.focus()}
              >
                {attendeeEmails.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="transition-colors hover:opacity-60"
                      style={{ color: 'var(--text-muted)', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="email-tag-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={() => {
                    if (emailInput) addEmail(emailInput)
                  }}
                  placeholder={attendeeEmails.length === 0 ? 'Type email and press Enter' : ''}
                  className="flex-1 min-w-[180px] bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {recipients
                    .filter((r) => !attendeeEmails.includes(r.email))
                    .map((r) => (
                      <button
                        key={r.email}
                        type="button"
                        onClick={() => addEmail(r.email)}
                        className="text-xs px-2 py-0.5 rounded transition-colors"
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        + {r.name || r.email}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || !title.trim() || !meetingDate}
            className="btn-green mt-5 px-5 py-2.5 text-sm font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating…' : 'Generate agenda'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div ref={previewRef} className="mb-10">
        {currentAgenda ? (
          <AgendaPreview
            agenda={currentAgenda}
            onSend={handleSend}
            onPrint={() => window.print()}
            sending={sending}
          />
        ) : (
          <div
            className="rounded-lg p-10 text-center no-print"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              Generate your first agenda above — Arlo will pull in everything outstanding
              automatically.
            </p>
          </div>
        )}
      </div>

      {/* Previous agendas */}
      {agendas.length > 0 && (
        <div className="no-print">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Previous agendas
          </h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <th
                    className="px-4 py-3 text-left font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Title
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Date
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Items
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Sent
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {agendas.map((agenda, i) => {
                  const totalItems = agenda.content.sections.reduce(
                    (sum, s) => sum + s.items.length,
                    0
                  )
                  const isActive = currentAgenda?.id === agenda.id
                  return (
                    <tr
                      key={agenda.id}
                      style={{
                        borderBottom:
                          i < agendas.length - 1 ? '1px solid var(--border)' : undefined,
                        background: isActive ? 'var(--surface)' : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {agenda.title}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                        {fmtDate(agenda.meeting_date)}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                        {totalItems}
                      </td>
                      <td className="px-4 py-3">
                        {agenda.sent_at ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{
                              background: 'var(--claim-badge-bg)',
                              color: 'var(--claim-badge-color)',
                            }}
                          >
                            Sent
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setCurrentAgenda(agenda)
                            setTimeout(
                              () =>
                                previewRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                }),
                              50
                            )
                          }}
                          className="text-xs font-medium transition-opacity"
                          style={{ color: isActive ? 'var(--text-faint)' : '#22d45f' }}
                          disabled={isActive}
                        >
                          {isActive ? 'Viewing' : 'View'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
