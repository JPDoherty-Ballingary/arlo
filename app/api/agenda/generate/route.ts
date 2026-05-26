import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, meetingDate, attendeeEmails } = await request.json()
  if (!title?.trim() || !meetingDate) {
    return NextResponse.json({ error: 'Title and meeting date are required' }, { status: 400 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: outstandingTasks },
    { data: completedTasks },
    { data: recipients },
    { data: profile },
  ] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select(
        'title, recipient_name, recipient_email, nag_count, deadline, urgency, last_nagged_at, scheduled_start_at, owner_notified_of_claim'
      )
      .eq('owner_id', user.id)
      .eq('status', 'active'),
    supabaseAdmin
      .from('tasks')
      .select('title, recipient_name, recipient_email, deadline, done_at')
      .eq('owner_id', user.id)
      .eq('status', 'done')
      .gte('done_at', sevenDaysAgo),
    supabaseAdmin
      .from('recipients')
      .select('email, name, reliability_score')
      .eq('owner_id', user.id),
    supabaseAdmin.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ])

  const ownerName = profile?.display_name || user.email || 'Owner'

  const reliabilityScores = (recipients || []).map((r) => ({
    email: r.email,
    name: r.name,
    reliability_score: r.reliability_score,
  }))

  const aiResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are Arlo, an AI chief of staff. Generate a concise professional meeting agenda from the data below. Return ONLY valid JSON, no markdown, no backticks, no explanation.

Meeting title: ${title}
Meeting date: ${meetingDate}
Owner: ${ownerName}

Outstanding tasks:
${JSON.stringify(outstandingTasks, null, 2)}

Completed in last 7 days:
${JSON.stringify(completedTasks, null, 2)}

Recipient reliability scores:
${JSON.stringify(reliabilityScores, null, 2)}

Return this exact structure:
{
  "title": "meeting title",
  "date": "formatted date",
  "summary": "one paragraph summary of the key focus for this meeting",
  "sections": [
    {
      "heading": "section heading",
      "items": [
        {
          "text": "agenda item",
          "owner": "person responsible or null",
          "urgency": "high/medium/low or null",
          "note": "relevant context or null"
        }
      ]
    }
  ]
}

Use these sections in order:
1. Wins — completed tasks since last meeting, brief and positive
2. Overdue — tasks past deadline, ordered by most overdue first
3. Needs attention — tasks with 5+ nags, or claiming done awaiting owner confirmation
4. Up next — tasks scheduled to start soon
5. To discuss — items needing a decision or ownership assigned in the meeting

Keep items concise. Be honest about urgency. If a recipient has a reliability score below 5 note it professionally but do not be rude. Omit any section that has no items.`,
      },
    ],
  })

  const aiText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
  let agendaContent: object

  try {
    const cleaned = aiText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    agendaContent = JSON.parse(cleaned)
  } catch {
    const match = aiText.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Failed to parse agenda from AI response' }, { status: 500 })
    }
    agendaContent = JSON.parse(match[0])
  }

  const { data: agenda, error } = await supabaseAdmin
    .from('agendas')
    .insert({
      owner_id: user.id,
      title: title.trim(),
      meeting_date: meetingDate,
      attendee_emails: attendeeEmails || [],
      content: agendaContent,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(agenda)
}
