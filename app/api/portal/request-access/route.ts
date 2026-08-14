import { supabaseAdmin } from '@/lib/supabase/admin'
import { issuePortalAccessLink } from '@/lib/portal-access'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const email = (body.email as string)?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const { data: recipient } = await supabaseAdmin
    .from('recipients')
    .select('id, owner_id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  // Always return the same generic response whether or not the email is a
  // known recipient, and whether or not the send actually succeeded — so
  // this endpoint can't be used to enumerate accounts, and a transient send
  // failure doesn't strand the caller on a broken error state.
  if (recipient) {
    await issuePortalAccessLink({ recipientId: recipient.id, ownerId: recipient.owner_id, email })
  }

  return NextResponse.json({ ok: true })
}
