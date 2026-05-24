import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: recipients }, { data: activeTasks }] = await Promise.all([
    supabase
      .from('recipients')
      .select('*')
      .eq('owner_id', user.id)
      .order('name', { ascending: true, nullsFirst: false }),
    supabase
      .from('tasks')
      .select('recipient_email')
      .eq('owner_id', user.id)
      .eq('status', 'active'),
  ])

  const activeCountByEmail: Record<string, number> = {}
  for (const t of activeTasks ?? []) {
    activeCountByEmail[t.recipient_email] = (activeCountByEmail[t.recipient_email] ?? 0) + 1
  }

  const contacts = (recipients ?? []).map((r) => ({
    ...r,
    active_task_count: activeCountByEmail[r.email] ?? 0,
  }))

  return NextResponse.json(contacts)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, email, notes } = body

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const { data: existing } = await supabase
    .from('recipients')
    .select('id')
    .eq('owner_id', user.id)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A contact with this email already exists' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('recipients')
    .insert({
      owner_id: user.id,
      email: normalizedEmail,
      name: name?.trim() || null,
      notes: notes?.trim() || null,
      total_tasks: 0,
      reliability_score: 5.0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, active_task_count: 0 }, { status: 201 })
}
