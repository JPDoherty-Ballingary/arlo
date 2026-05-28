import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/app/components/app-nav'
import ReviewClient from './review-client'

export const metadata: Metadata = { title: 'Transcript' }

type Recipient = {
  id: string
  name: string | null
  email: string
}

type ExistingTask = {
  id: string
  title: string
  recipient_email: string
  recipient_name: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: transcript, error } = await supabase
    .from('transcripts')
    .select('id, title, raw_text, parsed_tasks, created_at, tasks_saved_at')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !transcript) redirect('/transcripts')

  const { data: recipientRows } = await supabase
    .from('recipients')
    .select('id, name, email')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  const { data: existingTaskRows } = await supabase
    .from('tasks')
    .select('id, title, recipient_email, recipient_name')
    .eq('owner_id', user.id)
    .in('status', ['active', 'paused'])

  const recipients = (recipientRows ?? []) as Recipient[]
  const existingTasks = (existingTaskRows ?? []) as ExistingTask[]
  const meetingTitle = transcript.title || 'Untitled meeting'
  const parsedTasks = Array.isArray(transcript.parsed_tasks) ? transcript.parsed_tasks : []
  const alreadySaved = !!transcript.tasks_saved_at

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppNav userEmail={user.email} />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/transcripts"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to transcripts
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {meetingTitle}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-faint)' }}>
            Parsed {formatDate(transcript.created_at)}
          </p>
        </div>

        {alreadySaved ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="font-medium mb-2" style={{ color: '#22d45f' }}>
              Tasks already saved
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              The action items from this transcript were saved on{' '}
              {formatDate(transcript.tasks_saved_at!)}.
            </p>
            <Link
              href="/dashboard"
              className="btn-green px-6 py-2.5 rounded-md font-semibold text-sm inline-block"
            >
              Go to dashboard →
            </Link>
          </div>
        ) : (
          <ReviewClient
            transcriptId={id}
            meetingTitle={meetingTitle}
            rawText={transcript.raw_text || ''}
            initialParsedTasks={parsedTasks as Record<string, unknown>[]}
            initialRecipients={recipients}
            initialExistingTasks={existingTasks}
          />
        )}
      </main>
    </div>
  )
}
