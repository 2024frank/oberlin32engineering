// Host routing for the canonical public domain and the dedicated officer portal.

const PUBLIC_HOST = 'www.oberlin32engineeringsociety.com';
const APEX_HOST = 'oberlin32engineeringsociety.com';
const ADMIN_HOST = 'admin.oberlin32engineeringsociety.com';
const SHARED_PREFIXES = ['/assets/', '/api/'];

export const config = { matcher: '/:path*' };

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get('host') || url.hostname).split(':')[0].toLowerCase();

  // Keep one public URL for search engines, shared links, and browser storage.
  if (host === APEX_HOST) {
    const target = new URL(url);
    target.hostname = PUBLIC_HOST;
    target.host = PUBLIC_HOST;
    target.port = '';
    return new Response(null, { status: 308, headers: { Location: target.toString() } });
  }

  // `/admin` on the public site becomes the dedicated admin host.
  if (host !== ADMIN_HOST && /^\/admin(?:\/|$)/.test(url.pathname)) {
    const target = new URL(url);
    target.hostname = ADMIN_HOST;
    target.host = ADMIN_HOST;
    target.port = '';
    target.pathname = url.pathname.replace(/^\/admin\/?/, '/');
    return new Response(null, { status: 308, headers: { Location: target.toString() } });
  }

  if (host !== ADMIN_HOST) return;
  if (url.pathname.startsWith('/admin/')) return;
  if (SHARED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  // Serve the files under site/admin while keeping clean URLs on admin.*.
  const target = new URL(url);
  target.pathname = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`;
  return new Response(null, { headers: { 'x-middleware-rewrite': target.toString() } });
}
