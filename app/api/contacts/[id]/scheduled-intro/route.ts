import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function extractBodyText(html: string): string {
  const match = html.match(/<p class="body-text">([\s\S]*?)<\/p>/)
  if (!match) return ''
  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

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
    .select('id, subject, html, send_at')
    .eq('recipient_id', id)
    .eq('sent', false)
    .order('send_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!scheduled) return NextResponse.json(null)

  return NextResponse.json({
    id: scheduled.id,
    subject: scheduled.subject,
    send_at: scheduled.send_at,
    body_text: extractBodyText(scheduled.html),
  })
}
