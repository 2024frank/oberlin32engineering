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

  // One canonical admin URL. With cleanUrls on and trailing slashes off,
  // /admin/ on the public host would 308 to /admin and its relative
  // admin.css / admin.js would then resolve against the site root and 404.
  // Sending it to the subdomain avoids that whole class of bug.
  if (host !== ADMIN_HOST && /^\/admin(\/|$)/.test(url.pathname)) {
    const to = new URL(url);
    to.host = ADMIN_HOST;
    to.hostname = ADMIN_HOST;
    to.port = '';
    to.pathname = url.pathname.replace(/^\/admin\/?/, '/');
    return new Response(null, { status: 308, headers: { Location: to.toString() } });
  }

  if (host !== ADMIN_HOST) return;
  if (url.pathname.startsWith('/admin/')) return;
  if (SHARED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  // Target '/admin', not '/admin/index.html': with cleanUrls on, Vercel strips
  // the extension, so pointing at the .html file no longer resolves.
  const target = new URL(url);
  target.pathname = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`;

  return new Response(null, {
    headers: { 'x-middleware-rewrite': target.toString() },
  });
}
