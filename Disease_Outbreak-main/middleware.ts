import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

function withLanguageHeader(request: NextRequest, response: NextResponse): NextResponse {
  const langCookie = request.cookies.get('language')?.value
  const lang = langCookie || 'en'
  response.headers.set('x-language', lang)
  return response
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/auth')) return true
  // Public machine-to-machine endpoints (secured within handlers via secrets/headers where needed)
  if (pathname === '/api/telegram/webhook') return true
  if (pathname === '/api/telegram/bot') return true
  if (pathname === '/api/cron/risk-alerts') return true
  if (pathname === '/api/cron/daily-digest') return true
  // Public read APIs used by the landing page and dashboard widgets
  if (pathname === '/api/disease-data') return true
  if (pathname === '/api/healthcare') return true
  if (pathname === '/api/predictions') return true
  if (pathname === '/api/digest/state') return true
  if (pathname === '/api/location/state') return true
  if (pathname === '/sign-in' || pathname === '/sign-up') return true
  if (pathname === '/privacy' || pathname === '/terms') return true
  if (pathname === '/favicon.ico' || pathname === '/manifest.json') return true
  return false
}

const middleware = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname
  const next = withLanguageHeader(request, NextResponse.next())

  if (isPublicPath(pathname)) return next

  // If NEXTAUTH_SECRET is not set, don't hard-block the app (dev friendliness).
  // Set NEXTAUTH_SECRET to enable protection.
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return next

  const token = await getToken({ req: request, secret })
  if (token) return next

  const signInUrl = request.nextUrl.clone()
  signInUrl.pathname = '/sign-in'
  signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search)

  return withLanguageHeader(request, NextResponse.redirect(signInUrl))
}

export default middleware

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
}
