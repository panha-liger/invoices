import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/export') ||
    pathname.startsWith('/settings')
  const isLoginRoute = pathname === '/login'

  if (!isAppRoute && !isLoginRoute) return NextResponse.next({ request })

  try {
    let supabaseResponse = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && isAppRoute) return NextResponse.redirect(new URL('/login', request.url))
    if (user && isLoginRoute) return NextResponse.redirect(new URL('/dashboard', request.url))
    return supabaseResponse
  } catch {
    return NextResponse.next({ request })
  }
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
