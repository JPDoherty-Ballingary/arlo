'use client'

import { useState } from 'react'

type NagLog = {
  id: string
  created_at: string
  tone_used: string
  subject: string
  body: string
}

const TONE_STYLE: Record<string, { label: string }> = {
  friendly: { label: 'Friendly' },
  firm: { label: 'Firm' },
  direct: { label: 'Direct' },
  urgent: { label: 'Urgent' },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NagLogEntry({ log, index }: { log: NagLog; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const tone = log.tone_used?.toLowerCase() ?? 'friendly'
  const toneLabel = TONE_STYLE[tone]?.label ?? log.tone_used

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
        style={{ background: 'var(--surface)' }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22d45f')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
      >
        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-faint)', minWidth: 20 }}>
          #{index + 1}
        </span>

        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{
            background: `var(--tone-${tone}-bg)`,
            color: `var(--tone-${tone}-color)`,
          }}
        >
          {toneLabel}
        </span>

        <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
          {log.subject}
        </span>

        <span className="text-xs shrink-0 hidden sm:block" style={{ color: 'var(--text-faint)' }}>
          {formatDateTime(log.created_at)}
        </span>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-faint)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div
          className="px-4 py-4 text-sm"
          style={{
            background: 'var(--bg)',
            borderTop: '1px solid var(--border)',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{ __html: log.body }}
        />
      )}
    </div>
  )
}
