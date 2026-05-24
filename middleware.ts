import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Supabase ignores redirectTo when it contains a query string, so password
  // reset codes land at /?code=... — forward them to the real callback route.
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    url.searchParams.set('next', '/reset-password')
    return NextResponse.redirect(url)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const protectedPrefixes = ['/dashboard', '/transcripts', '/tasks', '/contacts']
  const isProtected = protectedPrefixes.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/transcripts/:path*', '/tasks/:path*', '/contacts/:path*'],
}
