import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (taskError || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const body = await request.json()
  const content = (body.content as string)?.trim()

  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  const { data: note, error } = await supabase
    .from('task_notes')
    .insert({ task_id: id, owner_id: user.id, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(note, { status: 201 })
}
