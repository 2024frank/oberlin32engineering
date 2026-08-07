// Host routing for the admin subdomain.
//
// vercel.json `rewrites` are evaluated only after the filesystem check, so any
// request that matches a real file (/, /about.html) is served before a rewrite
// can run. That let the whole public site answer on admin.* and left the admin
// root unreachable. Middleware runs ahead of the filesystem, so it is the only
// place this routing can happen correctly.

const ADMIN_HOST = 'admin.oberlin32engineeringsociety.com';

// Shared between both hosts: built assets and (later) the auth endpoints.
const SHARED_PREFIXES = ['/assets/', '/api/'];

export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || url.hostname;

  if (host !== ADMIN_HOST) return;
  if (url.pathname.startsWith('/admin/')) return;
  if (SHARED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  const target = new URL(url);
  target.pathname = url.pathname === '/' ? '/admin/index.html' : `/admin${url.pathname}`;

  return new Response(null, {
    headers: { 'x-middleware-rewrite': target.toString() },
  });
}
