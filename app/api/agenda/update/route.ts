import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agendaId, content } = await request.json()
  if (!agendaId || !content) {
    return NextResponse.json({ error: 'agendaId and content are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('agendas')
    .update({ content })
    .eq('id', agendaId)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
