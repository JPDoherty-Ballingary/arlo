import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { nagTask } from '@/lib/nag-task'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.status !== 'active') return NextResponse.json({ error: 'Task is not active' }, { status: 400 })

  const result = await nagTask(task)
  return NextResponse.json(result)
}
