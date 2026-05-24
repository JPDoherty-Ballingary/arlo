import { NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { resend } from '@/lib/resend'

type FirefliesPayload = {
  meetingId?: string
  clientReferenceId?: string
  eventType?: string
}

function extractJson(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

async function fetchFirefliesTranscript(
  meetingId: string,
  apiKey: string
): Promise<{ title: string; transcriptText: string } | null> {
  const query = `
    query Transcript($id: String!) {
      transcript(id: $id) {
        title
        date
        sentences {
          speaker_name
          text
        }
      }
    }
  `

  const res = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables: { id: meetingId } }),
  })

  if (!res.ok) {
    console.error('[fireflies] GraphQL request failed:', res.status, await res.text())
    return null
  }

  const json = (await res.json()) as {
    data?: {
      transcript?: {
        title?: string
        sentences?: { speaker_name: string; text: string }[]
      }
    }
    errors?: unknown
  }

  if (json.errors) {
    console.error('[fireflies] GraphQL errors:', JSON.stringify(json.errors))
  }

  const transcript = json.data?.transcript
  if (!transcript) return null

  const sentences = transcript.sentences ?? []
  const transcriptText = sentences.map((s) => `${s.speaker_name}: ${s.text}`).join('\n')
  const title = transcript.title || 'Untitled meeting'

  return { title, transcriptText }
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, fireflies_api_key')
    .eq('webhook_token', token)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const ownerId: string = profile.id

  let payload: FirefliesPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const meetingId = payload.meetingId
  console.log('[fireflies] webhook received — meetingId:', meetingId, '| eventType:', payload.eventType)

  // Mark connected on first webhook
  void supabaseAdmin
    .from('profiles')
    .update({ fireflies_connected: true })
    .eq('id', ownerId)

  after(async () => {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerId)
      const ownerEmail = userData.user?.email
      if (!ownerEmail) return

      if (!meetingId) {
        console.log('[fireflies] no meetingId in payload — nothing to fetch')
        return
      }

      const apiKey = profile.fireflies_api_key
      if (!apiKey) {
        console.log('[fireflies] no API key stored for user — saving empty transcript')
        await supabaseAdmin.from('transcripts').insert({
          owner_id: ownerId,
          raw_text: '',
          parsed_tasks: [],
          title: 'Untitled meeting',
        })
        return
      }

      const result = await fetchFirefliesTranscript(meetingId, apiKey)
      if (!result) {
        console.log('[fireflies] could not fetch transcript from Fireflies API')
        await supabaseAdmin.from('transcripts').insert({
          owner_id: ownerId,
          raw_text: '',
          parsed_tasks: [],
          title: 'Untitled meeting',
        })
        return
      }

      const { title: meetingTitle, transcriptText } = result
      console.log('[fireflies] fetched transcript — title:', meetingTitle, '| length:', transcriptText.length)

      if (!transcriptText.trim()) {
        await supabaseAdmin.from('transcripts').insert({
          owner_id: ownerId,
          raw_text: '',
          parsed_tasks: [],
          title: meetingTitle,
        })
        return
      }

      const now = new Date()
      const currentDate = now.toISOString().slice(0, 10)
      const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' })

      const aiResponse = await anthropic.messages.create({
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
${transcriptText}`,
          },
        ],
      })

      const rawText =
        aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '[]'
      let parsedTasks: unknown[]
      try {
        parsedTasks = JSON.parse(extractJson(rawText))
        if (!Array.isArray(parsedTasks)) parsedTasks = []
      } catch {
        parsedTasks = []
      }

      const { data: transcript } = await supabaseAdmin
        .from('transcripts')
        .insert({
          owner_id: ownerId,
          raw_text: transcriptText,
          parsed_tasks: parsedTasks,
          title: meetingTitle,
        })
        .select('id')
        .single()

      if (!transcript) return

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agent-arlo.com'
      const taskCount = parsedTasks.length

      await resend.emails.send({
        from: 'Arlo <arlo@agent-arlo.com>',
        to: ownerEmail,
        subject: `Arlo: new action items from "${meetingTitle}"`,
        html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #0a0a0a; padding: 24px 32px; border-bottom: 2px solid #22d45f; }
    .header h1 { color: #22d45f; margin: 0; font-size: 24px; letter-spacing: 2px; }
    .body { background: #111111; padding: 32px; }
    .body p { color: #cccccc; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #22d45f; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 4px; margin-top: 12px; }
    .footer { background: #0a0a0a; padding: 20px 32px; border-top: 1px solid #1a1a1a; }
    .footer p { color: #555; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>ARLO</h1></div>
    <div class="body">
      <p>Arlo has parsed your meeting <strong style="color:#ffffff;">&ldquo;${meetingTitle}&rdquo;</strong> and found <strong style="color:#22d45f;">${taskCount} action item${taskCount === 1 ? '' : 's'}</strong> waiting for your review.</p>
      <p>Click below to approve them and Arlo will start nagging.</p>
      <p><a href="${appUrl}/transcripts" class="btn">Review action items &rarr;</a></p>
    </div>
    <div class="footer"><p>Sent by Arlo &mdash; your Automated Relentless Loop Operator.</p></div>
  </div>
</body>
</html>`,
      })
    } catch (err) {
      console.error('[fireflies] processing error:', err)
    }
  })

  return NextResponse.json({ received: true })
}
