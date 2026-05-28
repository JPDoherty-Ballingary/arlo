import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { portalToken, taskId, content: rawContent } = body
  const content = (rawContent as string)?.trim()

  if (!portalToken || !taskId || !content) {
    return NextResponse.json({ error: 'portalToken, taskId and content are required' }, { status: 400 })
  }

  // Validate portal token
  const { data: session } = await supabaseAdmin
    .from('recipient_sessions')
    .select('email, expires_at')
    .eq('token', portalToken)
    .maybeSingle()

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired portal token' }, { status: 401 })
  }

  // Verify the task belongs to this recipient
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, owner_id')
    .eq('id', taskId)
    .eq('recipient_email', session.email)
    .maybeSingle()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const { data: note, error } = await supabaseAdmin
    .from('task_notes')
    .insert({
      task_id: task.id,
      owner_id: task.owner_id,
      content,
      author_email: session.email,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(note, { status: 201 })
}
