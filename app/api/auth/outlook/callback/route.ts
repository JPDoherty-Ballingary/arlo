import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/settings?outlook=error', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`,
        grant_type: 'authorization_code',
      }),
    }
  )

  const { access_token, refresh_token, expires_in } = await tokenResponse.json()

  const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const { mail, userPrincipalName } = await userResponse.json()

  await supabaseAdmin
    .from('profiles')
    .update({
      microsoft_access_token: access_token,
      microsoft_refresh_token: refresh_token,
      microsoft_token_expiry: new Date(Date.now() + expires_in * 1000).toISOString(),
      microsoft_email: mail || userPrincipalName,
    })
    .eq('id', user.id)

  return NextResponse.redirect(
    new URL('/settings?outlook=connected', process.env.NEXT_PUBLIC_APP_URL!)
  )
}
