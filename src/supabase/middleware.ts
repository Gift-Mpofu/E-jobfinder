import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('refresh token') || msg.includes('invalid_grant') || msg.includes('token not found')) {
        request.cookies.getAll().forEach(cookie => {
          if (cookie.name.includes('auth-token') || cookie.name.startsWith('sb-')) {
            supabaseResponse.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
          }
        })
      }
    }

    const isAuthPage =
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup')

    // Protect the dashboard - redirect to login if not authenticated or invalid token
    if ((!user || error) && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Prevent logged-in users from seeing the login/signup pages
    if (user && !error && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    console.warn('Supabase middleware auth update warning:', error)
  }

  return supabaseResponse
}
