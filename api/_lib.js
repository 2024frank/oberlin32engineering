'use strict';

/* Shared helpers for the admin API.
 *
 * No dependencies on purpose: the build runs with installCommand disabled, so
 * there is no node_modules. Everything here talks to Supabase and Resend over
 * their REST APIs with the global fetch in the Node runtime.
 *
 * Identity stays in Supabase Auth. Resend only carries the mail, which means
 * passwords, sessions and reset tokens are never our code's problem.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

const SITE = 'https://www.oberlin32engineeringsociety.com';
const ADMIN_ORIGIN = 'https://admin.oberlin32engineeringsociety.com';
const FROM = process.env.RESEND_FROM_EMAIL || 'Oberlin 3-2 Engineering Society <society@oberlin32engineeringsociety.com>';

function missingConfig() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!RESEND_KEY) missing.push('RESEND_API_KEY');
  return missing;
}

/* ---------------------------------------------------------------- http ---- */

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(JSON.stringify(body));
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin === ADMIN_ORIGIN || origin === SITE) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/* ------------------------------------------------------------ supabase ---- */

async function sb(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const err = new Error((data && (data.message || data.msg || data.error_description)) || `supabase ${r.status}`);
    err.status = r.status;
    err.detail = data;
    throw err;
  }
  return data;
}

/* Verify the caller's access token and confirm they are an admin.
 * Returns the caller's profile, or throws with a status. */
async function requireAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) { const e = new Error('Sign in required.'); e.status = 401; throw e; }

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY || SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) { const e = new Error('Session expired. Sign in again.'); e.status = 401; throw e; }
  const user = await who.json();

  const rows = await sb(`/rest/v1/profiles?id=eq.${user.id}&select=id,email,full_name,role`);
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile || profile.role !== 'admin') {
    const e = new Error('Administrator access required.');
    e.status = 403;
    throw e;
  }
  return profile;
}

/* --------------------------------------------------------------- email ---- */

/* Minimal markdown: bold, links, paragraphs. Enough for the templates we ship,
 * and small enough to audit. Everything is escaped before formatting. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function markdownToHtml(md) {
  return escapeHtml(md)
    .split(/\n{2,}/)
    .map((block) => {
      const html = block
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    })
    .join('\n');
}

function fillTemplate(text, vars) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : ''));
}

/* House style, matching the site: white ground, Oberlin crimson, no ornament. */
function wrapEmail({ title, bodyHtml, actionLabel, actionUrl, footerNote }) {
  const action = actionUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0">
         <tr><td style="background:#a6192e;border-radius:4px">
           <a href="${escapeHtml(actionUrl)}"
              style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">
             ${escapeHtml(actionLabel || 'Continue')}</a>
         </td></tr>
       </table>
       <p style="font-size:12px;color:#6b7280;margin:0 0 18px">
         If the button does not work, paste this into your browser:<br>
         <span style="color:#a6192e;word-break:break-all">${escapeHtml(actionUrl)}</span>
       </p>`
    : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border:1px solid #e2e5ea;border-radius:6px">
        <tr><td style="height:6px;background:#a6192e;border-radius:6px 6px 0 0"></td></tr>
        <tr><td style="padding:30px 30px 8px">
          <div style="font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;color:#6b7280;text-transform:uppercase">
            Oberlin 3-2 Engineering Society
          </div>
          <h1 style="margin:14px 0 4px;font:700 22px/1.25 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14161a">
            ${escapeHtml(title)}
          </h1>
        </td></tr>
        <tr><td style="padding:6px 30px 26px;font:400 15px/1.62 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#333941">
          ${bodyHtml}
          ${action}
        </td></tr>
        <tr><td style="padding:16px 30px 26px;border-top:1px solid #e2e5ea;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#6b7280">
          ${footerNote || `Sent by the Oberlin 3-2 Engineering Society. <a href="${SITE}" style="color:#a6192e">${SITE.replace('https://', '')}</a>`}
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendEmail({ to, subject, html, replyTo, tag }) {
  const payload = { from: FROM, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;
  if (tag) payload.tags = [{ name: 'kind', value: tag }];

  /* Resend sits behind Cloudflare, which returned 403 "error code: 1010" to a
   * default library user agent during testing. Identify ourselves explicitly. */
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'oberlin32engineeringsociety.com (+https://www.oberlin32engineeringsociety.com)',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.message || `resend ${r.status}`);
    e.status = 502;
    e.detail = data;
    throw e;
  }
  return data;
}

/* Ask Supabase for a signed action link. Supabase owns the token, its expiry
 * and its single use; we only put it in a nicer envelope. */
async function generateActionLink(type, email, redirectTo) {
  const data = await sb('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type, email, options: { redirect_to: redirectTo } }),
  });
  const link = (data && (data.action_link || (data.properties && data.properties.action_link))) || null;
  if (!link || !redirectTo) return link;

  /* Supabase ignores options.redirect_to and substitutes the project's Site
   * URL, which is still the default localhost:3000. Rewriting the parameter on
   * the returned verify URL is honoured, because it is validated against the
   * Redirect URLs allow-list rather than against Site URL. Verified: the link
   * 303s to the admin subdomain with a valid session. */
  try {
    const u = new URL(link);
    if (u.searchParams.get('redirect_to') !== redirectTo) {
      u.searchParams.set('redirect_to', redirectTo);
      return u.toString();
    }
  } catch { /* if it will not parse, send what Supabase gave us */ }
  return link;
}

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

module.exports = {
  SUPABASE_URL, SERVICE_KEY, ANON_KEY, RESEND_KEY, SITE, ADMIN_ORIGIN, FROM,
  missingConfig, send, cors, readJson, sb, requireAdmin,
  escapeHtml, markdownToHtml, fillTemplate, wrapEmail, sendEmail,
  generateActionLink, isEmail,
};
