import { NextResponse, type NextRequest } from 'next/server'

// Host routing for the canonical public domain and the dedicated officer portal host,
// matching the behaviour the legacy site provided:
//   apex                -> 308 to the canonical www host
//   www/admin/*         -> 308 to the officer host, with the /admin prefix dropped
//   officer host/<path> -> rewritten to /admin/<path>, so its URLs stay clean
//
// Both hosts are read from the environment. With ADMIN_HOST unset (local development,
// preview deployments, *.vercel.app) this middleware is inert and every route behaves
// exactly as it does without it.
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase() ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? ''

function safeHost(value: string) {
  try { return new URL(value).host.toLowerCase() } catch { return '' }
}

// Apex/www canonicalisation is left to Vercel's domain configuration. Doing it here too
// caused an infinite loop: Vercel redirected www -> apex while this middleware redirected
// apex -> www. Both spellings are treated as the public site instead.
const PUBLIC_HOSTS = new Set<string>()
{
  const host = safeHost(SITE_URL)
  if (host) {
    PUBLIC_HOSTS.add(host)
    PUBLIC_HOSTS.add(host.startsWith('www.') ? host.slice(4) : `www.${host}`)
  }
}

// Paths that must reach their real route on the officer host without gaining an
// /admin prefix: the portal itself, API handlers, and the auth landing pages that
// officer invite and password-reset emails point at.
const PASS_THROUGH = [/^\/admin(?:\/|$)/, /^\/api\//, /^\/auth\//, /^\/staff-activate$/, /^\/staff-reset-password$/]

export function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const host = (request.headers.get('host') ?? url.hostname).split(':')[0].toLowerCase()

  if (!ADMIN_HOST) return NextResponse.next()

  // /admin on the public site belongs on the officer host. Deliberately scoped to the
  // real public hosts so /admin keeps working on *.vercel.app and preview deployments,
  // which would otherwise be redirected to a domain that may not be live.
  if (PUBLIC_HOSTS.has(host) && /^\/admin(?:\/|$)/.test(url.pathname)) {
    url.host = ADMIN_HOST
    url.port = ''
    url.pathname = url.pathname.replace(/^\/admin\/?/, '/')
    return NextResponse.redirect(url, 308)
  }

  if (host !== ADMIN_HOST) return NextResponse.next()

  // Portal redirects (e.g. requireAdmin sending an unauthenticated visitor to
  // /admin/login) would otherwise surface as admin.host/admin/login. Strip the prefix
  // so the officer host keeps clean URLs; the rewrite below maps it back internally.
  if (/^\/admin(?:\/|$)/.test(url.pathname)) {
    const stripped = url.pathname.replace(/^\/admin/, '') || '/'
    if (stripped !== url.pathname) {
      url.pathname = stripped
      return NextResponse.redirect(url, 307)
    }
  }

  if (PASS_THROUGH.some(pattern => pattern.test(url.pathname))) return NextResponse.next()

  url.pathname = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|robots.txt|sitemap.xml|brand/).*)']
}
