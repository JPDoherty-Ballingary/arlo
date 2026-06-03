import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const { token, availableMinutes } = await request.json()

  if (!token || !availableMinutes || typeof availableMinutes !== 'number') {
    return NextResponse.json({ error: 'token and availableMinutes required' }, { status: 400 })
  }

  const { data: session } = await supabaseAdmin
    .from('recipient_sessions')
    .select('id, email, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const { email } = session

  const { data: rawTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, urgency, deadline, nag_count, last_nagged_at, created_at')
    .eq('recipient_email', email)
    .eq('status', 'active')

  const tasks = (rawTasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    urgency: t.urgency,
    deadline: t.deadline ?? null,
    nag_count: t.nag_count,
    last_nagged_at: t.last_nagged_at ?? null,
    created_at: t.created_at,
  }))

  if (tasks.length === 0) {
    return NextResponse.json({
      greeting: "You're all clear — nothing outstanding right now.",
      actions: [],
      skip: [],
    })
  }

  const aiResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are Arlo, an AI chief of staff. The user has ${availableMinutes} minutes free right now. Based on their outstanding tasks, tell them exactly what to do with that time.

Be direct and specific. Don't waffle. Give them 2-4 specific actions they can realistically complete or meaningfully progress in ${availableMinutes} minutes.

Consider:
- Urgency and deadline proximity
- How long the task has been outstanding
- How many times they've already been reminded — higher nag count means this is more overdue
- Quick wins vs longer items

Outstanding tasks assigned to this person:
${JSON.stringify(tasks, null, 2)}

Return ONLY this exact JSON:
{
  "greeting": "one short punchy sentence e.g. 'You've got 30 minutes — here's what actually needs doing.'",
  "actions": [
    {
      "task_id": "uuid of the related task or null",
      "action": "specific thing to do right now — not vague, be specific",
      "why": "one sentence explaining why this is the priority",
      "estimated_minutes": 10,
      "type": "action" | "decision" | "review" | "respond"
    }
  ],
  "skip": ["tasks deprioritised and why in one line"]
}`,
      },
    ],
  })

  const raw = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const result = JSON.parse(jsonMatch[0])
  return NextResponse.json(result)
}
