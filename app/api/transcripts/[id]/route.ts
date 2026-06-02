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

  const { data: transcript, error: fetchError } = await supabase
    .from('transcripts')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (fetchError || !transcript) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> =
    typeof body.title === 'string'
      ? { title: body.title.trim() || null }
      : { tasks_saved_at: new Date().toISOString() }

  const { error: updateError } = await supabase
    .from('transcripts')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
