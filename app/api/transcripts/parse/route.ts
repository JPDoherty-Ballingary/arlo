import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

// Route segment config — this is how Next.js's App Router surfaces a
// function timeout to the deployment platform's build output; a vercel.json
// "functions" glob entry isn't the mechanism this framework version uses.
export const maxDuration = 60

const TRANSCRIPT_MAX_CHARS = 8000
const CLAUDE_TIMEOUT_MS = 45_000

function extractJson(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { transcript, meetingTitle, projectId } = body

  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
  }

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
  const currentDayName = now.toLocaleDateString('en-US', { timeZone: 'Europe/London', weekday: 'long' })

  // Cap what we send Claude — a long enough transcript was pushing this
  // route past Vercel's function timeout. Action items tend to surface
  // throughout a meeting, not just in the first 8k characters, so this is a
  // blunt mitigation, not a correctness guarantee — worth revisiting with
  // real chunking/summarization if truncated transcripts start missing items.
  const truncatedTranscript =
    transcript.length > TRANSCRIPT_MAX_CHARS
      ? transcript.slice(0, TRANSCRIPT_MAX_CHARS) + '\n[transcript truncated]'
      : transcript

  let response
  try {
    response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Extract all action items from this meeting transcript. Return ONLY a valid JSON array with no other text, no markdown, no backticks, no explanation.

Today is ${currentDayName}, ${currentDate}. Use this as the base date for all deadline calculations.

For suggested_deadline, always provide an absolute ISO 8601 date-time string — never null. Infer a deadline using this priority order:
1. Explicit date/time mentioned in the transcript (e.g. "by Friday", "end of next week", "in two weeks") — resolve to an absolute date
2. Strong urgency cues in the conversation (e.g. "window isn't open forever", "time sensitive", "ASAP") — use 1-2 days from today
3. Otherwise fall back to the urgency level: high → 2 days, medium → 5 days, low → 14 days

Use 17:00:00Z as the time when no specific time is mentioned.

Each item must follow this exact structure:
{
  "title": "clear specific action item",
  "context": "relevant context from the transcript that would help when following up",
  "suggested_deadline": "ISO 8601 date-time string",
  "urgency": "low" or "medium" or "high",
  "recipient_hint": "name or role of who should do this if mentioned, or null"
}

Transcript:
${truncatedTranscript}`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('claude_timeout')), CLAUDE_TIMEOUT_MS)
      ),
    ])
  } catch (err) {
    const timedOut = err instanceof Error && err.message === 'claude_timeout'
    console.error('Transcript parse failed', err)
    return NextResponse.json(
      {
        error: timedOut
          ? 'Arlo took too long to read this transcript. Try a shorter one, or split it into sections.'
          : 'Arlo hit an error reaching Claude. Please try again.',
      },
      { status: timedOut ? 504 : 502 }
    )
  }

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = extractJson(rawText)

  let parsed: unknown[]
  try {
    parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) throw new Error('Response was not an array')
  } catch {
    return NextResponse.json(
      { error: 'Arlo could not parse the transcript into tasks. Try again.' },
      { status: 500 }
    )
  }

  await supabase.from('transcripts').insert({
    owner_id: user.id,
    raw_text: transcript,
    parsed_tasks: parsed,
    title: meetingTitle?.trim() || null,
    project_id: projectId || null,
  })

  return NextResponse.json(parsed)
}
