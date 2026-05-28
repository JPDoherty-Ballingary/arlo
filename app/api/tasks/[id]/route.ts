import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const body = await request.json()
  const { status } = body

  // ── Context append ────────────────────────────────────────────────────────
  if (body.append_context !== undefined) {
    const note = (body.append_context as string).trim()
    const existing = (task.context as string | null) || ''
    const newContext = existing ? `${existing}\n\n${note}` : note

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ context: newContext })
      .eq('id', id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json(updatedTask)
  }

  // ── Field edit ────────────────────────────────────────────────────────────
  if (!status) {
    const { title, context, recipient_email, recipient_name, urgency, deadline, frequency_hours, scheduled_start_at } = body

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!recipient_email?.trim()) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        title: title.trim(),
        context: context?.trim() || null,
        recipient_email: recipient_email.trim().toLowerCase(),
        recipient_name: recipient_name?.trim() || null,
        urgency: urgency || 'medium',
        deadline: deadline || null,
        frequency_hours: frequency_hours || 24,
        scheduled_start_at: scheduled_start_at || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json(updatedTask)
  }

  // ── Status update ─────────────────────────────────────────────────────────
  if (!['done', 'paused', 'active'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (status === 'done') {
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'done', done_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: recipient } = await supabase
      .from('recipients')
      .select('*')
      .eq('owner_id', user.id)
      .eq('email', task.recipient_email)
      .single()

    if (recipient) {
      const newTasksCompleted = recipient.tasks_completed + 1
      const newTotalNags = recipient.total_nags + task.nag_count
      const newAvgNags = newTotalNags / newTasksCompleted
      const newScore = Math.max(0, 10 - Math.min(10, newAvgNags * 0.8))

      await supabase
        .from('recipients')
        .update({
          tasks_completed: newTasksCompleted,
          total_nags: newTotalNags,
          average_nags_to_complete: newAvgNags,
          reliability_score: newScore,
        })
        .eq('id', recipient.id)
    }

    return NextResponse.json(updatedTask)
  }

  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedTask)
}
