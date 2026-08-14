import { createClient } from '@/lib/supabase/server'
import { issuePortalAccessLink } from '@/lib/portal-access'
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

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: recipient, error } = await supabase
    .from('recipients')
    .select('id, email, owner_id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error || !recipient) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  const result = await issuePortalAccessLink({
    recipientId: recipient.id,
    ownerId: recipient.owner_id,
    email: recipient.email,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Failed to send access link. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
