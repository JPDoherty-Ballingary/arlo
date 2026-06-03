import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getValidMicrosoftToken(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry')
    .eq('id', userId)
    .single()

  if (!profile?.microsoft_access_token) return null

  const expiresAt = new Date(profile.microsoft_token_expiry)
  const needsRefresh = expiresAt < new Date(Date.now() + 5 * 60 * 1000)

  if (!needsRefresh) return profile.microsoft_access_token

  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: profile.microsoft_refresh_token!,
        grant_type: 'refresh_token',
        scope: 'Calendars.Read User.Read offline_access',
      }),
    }
  )

  const { access_token, refresh_token, expires_in } = await response.json()

  await supabaseAdmin
    .from('profiles')
    .update({
      microsoft_access_token: access_token,
      microsoft_refresh_token: refresh_token,
      microsoft_token_expiry: new Date(Date.now() + expires_in * 1000).toISOString(),
    })
    .eq('id', userId)

  return access_token
}
