import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidMicrosoftToken } from '@/lib/microsoft'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getValidMicrosoftToken(user.id)
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  const now = new Date().toISOString()
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarview` +
      `?startDateTime=${now}&endDateTime=${twoWeeks}` +
      `&$select=subject,start,end,attendees,organizer,location` +
      `&$orderby=start/dateTime` +
      `&$top=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 502 })
  }

  const { value: events } = await response.json()

  const mapped = (events ?? []).map((e: CalendarEvent) => ({
    id: e.id,
    subject: e.subject,
    start: e.start,
    end: e.end,
    attendees: (e.attendees ?? []).map((a) => a.emailAddress?.address).filter(Boolean),
    organizer: e.organizer?.emailAddress?.address ?? null,
    location: e.location?.displayName ?? null,
  }))

  return NextResponse.json({ events: mapped })
}

type CalendarEvent = {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: { emailAddress?: { address: string } }[]
  organizer?: { emailAddress?: { address: string } }
  location?: { displayName?: string }
}
