import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

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
  const { transcript } = body

  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
  }

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
  const currentDayName = now.toLocaleDateString('en-US', { timeZone: 'Europe/London', weekday: 'long' })

  const response = await anthropic.messages.create({
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
${transcript}`,
      },
    ],
  })

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
  })

  return NextResponse.json(parsed)
}
