import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants'

/**
 * Next 16 proxy.ts — 쿠키 존재 여부만 체크하고 redirect.
 * 실제 세션 유효성은 보호 라우트 안에서 verifySession()으로 다시 확인.
 *
 * Edge runtime이라 Prisma는 못 부른다. 그래서 "확실히 비로그인"만 차단.
 * mustChangePassword 같은 DB 의존 검사는 dashboard layout에서 처리.
 */

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/_next',
  '/api/auth/login',
  '/favicon.ico',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSessionCookie = req.cookies.has(SESSION_COOKIE_NAME)

  // 로그인한 사용자가 /login 접근 시 → 대시보드
  if (hasSessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 비로그인 사용자가 보호 라우트 접근 시
  if (!hasSessionCookie && !isPublic(pathname) && pathname !== '/') {
    // API 라우트는 401 JSON, 페이지는 /login redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // pathname을 layout에서 알 수 있도록 헤더로 전달
  // (server component에서 next/headers로 읽을 수 있음)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp)$).*)'],
}
