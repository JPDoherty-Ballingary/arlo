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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('recipients')
    .select('id, email')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const body = await request.json()
  const { name, email, notes, digest_mode } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name?.trim() || null
  if (notes !== undefined) updates.notes = notes?.trim() || null
  if (email?.trim()) updates.email = email.trim().toLowerCase()
  if (digest_mode !== undefined) updates.digest_mode = Boolean(digest_mode)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recipients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
