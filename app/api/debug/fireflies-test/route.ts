import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url = new URL(request.url)
  const meetingId = url.searchParams.get('meetingId')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('fireflies_api_key, webhook_token')
    .eq('id', user.id)
    .maybeSingle()

  const result: Record<string, unknown> = {
    user_id: user.id,
    has_api_key: !!profile?.fireflies_api_key,
    api_key_length: profile?.fireflies_api_key?.length ?? 0,
    has_webhook_token: !!profile?.webhook_token,
  }

  if (!meetingId) {
    // List recent transcripts to find a meetingId to test with
    const { data: transcripts } = await supabaseAdmin
      .from('transcripts')
      .select('id, title, raw_text, meeting_id, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    result.transcripts = transcripts?.map((t) => ({
      id: t.id,
      title: t.title,
      meeting_id: t.meeting_id ?? null,
      raw_text_length: t.raw_text?.length ?? 0,
      created_at: t.created_at,
    }))
    result.hint = 'Pass ?meetingId=<id> to test the Fireflies GraphQL API directly'
    return NextResponse.json(result)
  }

  if (!profile?.fireflies_api_key) {
    return NextResponse.json({ ...result, error: 'No API key stored' }, { status: 400 })
  }

  const query = `
    query Transcript($id: String!) {
      transcript(id: $id) {
        title
        date
        sentences {
          speaker_name
          text
        }
      }
    }
  `

  const res = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${profile.fireflies_api_key}`,
    },
    body: JSON.stringify({ query, variables: { id: meetingId } }),
  })

  const text = await res.text()
  let json: unknown
  try { json = JSON.parse(text) } catch { json = text }

  result.graphql_status = res.status
  result.graphql_response = json

  // If successful, show sentence count and first few lines
  if (res.ok && typeof json === 'object' && json !== null) {
    const data = (json as Record<string, unknown>).data as Record<string, unknown> | undefined
    const transcript = data?.transcript as Record<string, unknown> | undefined
    const sentences = transcript?.sentences as unknown[] | undefined
    if (sentences) {
      result.sentence_count = sentences.length
      result.first_3_sentences = sentences.slice(0, 3)
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
}
