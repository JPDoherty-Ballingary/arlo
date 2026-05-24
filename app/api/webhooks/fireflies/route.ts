import { NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { resend } from '@/lib/resend'

function extractJson(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

async function processTranscript(
  meetingId: string,
  ownerId: string,
  ownerEmail: string,
  ownerName: string | null,
) {
  try {
    const query = `
      query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          date
          sentences {
            speaker_name
            text
          }
        }
      }
    `

    const firefliesResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({ query, variables: { transcriptId: meetingId } }),
    })

    const firefliesData = (await firefliesResponse.json()) as {
      data?: { transcript?: { title?: string; sentences?: { speaker_name: string; text: string }[] } }
      errors?: unknown
    }

    if (firefliesData.errors) {
      console.error('[fireflies] GraphQL errors:', JSON.stringify(firefliesData.errors))
    }

    const transcript = firefliesData?.data?.transcript

    if (!transcript) {
      console.error('[fireflies] no transcript returned for meetingId:', meetingId)
      return
    }

    const transcriptText =
      transcript.sentences?.map((s) => `${s.speaker_name}: ${s.text}`).join('\n') || ''

    const meetingTitle = transcript.title || 'Untitled meeting'

    if (!transcriptText) {
      console.error('[fireflies] empty transcript text for meetingId:', meetingId)
      return
    }

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Extract all action items from this meeting transcript. Return ONLY a valid JSON array with no other text, no markdown, no backticks, no explanation.

Each item must follow this exact structure:
{
  "title": "clear specific action item",
  "context": "relevant context from the transcript",
  "suggested_deadline": "ISO date string or null",
  "urgency": "low" or "medium" or "high",
  "recipient_hint": "name or role if mentioned or null"
}

Transcript:
${transcriptText}`,
        },
      ],
    })

    const responseText =
      claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''

    let parsedTasks: unknown[] = []
    try {
      const parsed = JSON.parse(extractJson(responseText))
      parsedTasks = Array.isArray(parsed) ? parsed : []
    } catch {
      parsedTasks = []
    }

    await supabaseAdmin.from('transcripts').insert({
      owner_id: ownerId,
      meeting_id: meetingId,
      raw_text: transcriptText,
      parsed_tasks: parsedTasks,
      title: meetingTitle,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agent-arlo.com'
    const taskCount = parsedTasks.length

    await resend.emails.send({
      from: 'Arlo <arlo@agent-arlo.com>',
      to: ownerEmail,
      subject: `Arlo: ${taskCount} action item${taskCount !== 1 ? 's' : ''} found in "${meetingTitle}"`,
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
      <p>Arlo has parsed your meeting <strong style="color:#ffffff;">&ldquo;${meetingTitle}&rdquo;</strong> and found <strong style="color:#22d45f;">${taskCount} action item${taskCount !== 1 ? 's' : ''}</strong> waiting for your review.</p>
      <p>Click below to approve them and Arlo will start nagging.</p>
      <p><a href="${appUrl}/transcripts" class="btn">Review action items &rarr;</a></p>
    </div>
    <div class="footer"><p>Sent by Arlo &mdash; your Automated Relentless Loop Operator.</p></div>
  </div>
</body>
</html>`,
    })
  } catch (error) {
    console.error('[fireflies] error processing transcript:', error)
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name')
    .eq('webhook_token', token)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let body: { meetingId?: string; eventType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const meetingId = body.meetingId
  console.log('[fireflies] webhook received — meetingId:', meetingId, '| eventType:', body.eventType)

  if (!meetingId) {
    return NextResponse.json({ ok: true })
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
  const ownerEmail = userData.user?.email

  if (!ownerEmail) {
    return NextResponse.json({ ok: true })
  }

  after(() => processTranscript(meetingId, profile.id, ownerEmail, profile.display_name ?? null))

  return NextResponse.json({ ok: true })
}
