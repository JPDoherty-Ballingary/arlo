import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendDailyDigest } from '@/lib/nag-digest'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: digestRecipients, error } = await supabaseAdmin
    .from('recipients')
    .select('id, owner_id, email')
    .eq('digest_mode', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: unknown[] = []

  for (const recipient of digestRecipients ?? []) {
    try {
      const result = await sendDailyDigest(recipient)
      results.push({ recipientId: recipient.id, email: recipient.email, ...result })
    } catch (err) {
      results.push({ recipientId: recipient.id, error: String(err) })
    }
  }

  return NextResponse.json({
    total_digest_recipients: digestRecipients?.length ?? 0,
    results,
  })
}
