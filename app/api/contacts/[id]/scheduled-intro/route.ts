import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contact } = await supabase
    .from('recipients')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: scheduled } = await supabaseAdmin
    .from('scheduled_emails')
    .select('id, subject, send_at')
    .eq('recipient_id', id)
    .eq('sent', false)
    .order('send_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(scheduled ?? null)
}
