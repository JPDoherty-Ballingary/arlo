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

  const { availableMinutes } = await request.json()
  if (!availableMinutes || typeof availableMinutes !== 'number') {
    return NextResponse.json({ error: 'availableMinutes required' }, { status: 400 })
  }

  const [{ data: rawTasks }, { data: recipients }] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('id, title, context, recipient_name, recipient_email, urgency, deadline, nag_count, last_nagged_at, created_at, project_id, projects(name)')
      .eq('owner_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('recipients')
      .select('email, reliability_score')
      .eq('owner_id', user.id),
  ])

  const reliabilityMap: Record<string, number> = {}
  for (const r of recipients ?? []) {
    reliabilityMap[r.email] = r.reliability_score
  }

  const tasks = (rawTasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    context: t.context ?? null,
    recipient_name: t.recipient_name ?? null,
    urgency: t.urgency,
    deadline: t.deadline ?? null,
    nag_count: t.nag_count,
    last_nagged_at: t.last_nagged_at ?? null,
    created_at: t.created_at,
    project: (Array.isArray(t.projects) ? (t.projects[0] as { name: string } | undefined)?.name : (t.projects as { name: string } | null)?.name) ?? null,
    recipient_reliability_score: t.recipient_email ? (reliabilityMap[t.recipient_email] ?? null) : null,
  }))

  if (tasks.length === 0) {
    return NextResponse.json({
      greeting: "You're all clear — no active tasks right now.",
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

Be direct and specific. Don't waffle. Give them a prioritised list of 2-4 actions they can realistically complete or meaningfully progress in ${availableMinutes} minutes.

Consider:
- Urgency and deadline proximity
- How long a task has been outstanding
- Whether the recipient is reliable or tends to ignore things (low reliability score = chase harder)
- Tasks that are blocking other tasks
- Quick wins vs long term items

Outstanding tasks:
${JSON.stringify(tasks, null, 2)}

Return ONLY this exact JSON:
{
  "greeting": "one short punchy sentence about what they should focus on e.g. 'You've got 30 minutes — here's what actually matters right now.'",
  "actions": [
    {
      "task_id": "uuid of the related task or null if general",
      "action": "specific thing to do right now — not vague, not 'follow up', be specific",
      "why": "one sentence explaining why this is the priority",
      "estimated_minutes": 5,
      "type": "chase" | "action" | "decision" | "review"
    }
  ],
  "skip": ["any tasks deliberately deprioritised and why in one line"]
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
