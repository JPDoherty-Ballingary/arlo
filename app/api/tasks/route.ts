import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, context, recipient_email, recipient_name, urgency, deadline, frequency_hours } =
    body

  if (!title?.trim() || !recipient_email?.trim()) {
    return NextResponse.json(
      { error: 'Title and recipient email are required' },
      { status: 400 }
    )
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      owner_id: user.id,
      title: title.trim(),
      context: context?.trim() || null,
      recipient_email: recipient_email.trim().toLowerCase(),
      recipient_name: recipient_name?.trim() || null,
      urgency: urgency || 'medium',
      deadline: deadline || null,
      frequency_hours: frequency_hours || 24,
    })
    .select()
    .single()

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  const normalizedEmail = recipient_email.trim().toLowerCase()

  const { data: existingRecipient } = await supabase
    .from('recipients')
    .select('*')
    .eq('owner_id', user.id)
    .eq('email', normalizedEmail)
    .single()

  if (existingRecipient) {
    await supabase
      .from('recipients')
      .update({
        ...(recipient_name?.trim() ? { name: recipient_name.trim() } : {}),
        total_tasks: existingRecipient.total_tasks + 1,
      })
      .eq('id', existingRecipient.id)
  } else {
    await supabase.from('recipients').insert({
      owner_id: user.id,
      email: normalizedEmail,
      name: recipient_name?.trim() || null,
      total_tasks: 1,
      reliability_score: 5.0,
    })
  }

  return NextResponse.json(task, { status: 201 })
}
