import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that should never be slowed by session refresh
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/verify-email',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip session refresh entirely for public/auth routes
  // This is what makes Google OAuth fast
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

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

  // Hard 800ms timeout — Vercel limit is 1500ms
  // If Supabase is slow we still respond in time
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 800)
      ),
    ])
  } catch {
    // Continue regardless — client handles auth state
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
