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
/* Google Workspace treats oberlin32engineeringsociety.com as a lookalike of
 * oberlin.edu and silently removes the mail after delivery, whatever the
 * content. Verified by sending the same plain message from both domains. */
const FROM = process.env.RESEND_FROM_EMAIL || 'Oberlin 3-2 Engineering Society <hello@uhurued.com>';

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

/* Plain email: the emblem, a few sentences, a hyperlink.
 *
 * No table layout, no masthead, no call-to-action button. That furniture reads
 * as a marketing template rather than a note from a student society. */
function wrapEmail({ bodyHtml, actionUrl, actionLabel, footerNote }) {
  const action = actionUrl
    ? `<p style="margin:18px 0"><a href="${escapeHtml(actionUrl)}" style="color:#a6192e">${escapeHtml(actionLabel || 'Set up your account here')}</a></p>`
    : '';

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff">
  <div style="max-width:520px;font:400 15px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14161a">
    <img src="${SITE}/assets/images/logo-email.png" width="40" height="40" alt="Oberlin 3-2 Engineering Society"
         style="display:block;width:40px;height:40px;border:0;margin-bottom:18px">
    ${bodyHtml}
    ${action}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e5ea;font-size:13px;color:#6b7280">
      ${footerNote || 'Oberlin 3-2 Engineering Society, Oberlin College'}
    </p>
  </div></body></html>`;
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
/* Ask Supabase for a one-time code. It also returns a clickable link, but we
 * do not send that: Oberlin's mail filter fetches links to inspect them, which
 * spends the single-use token before the recipient sees the message. A code
 * cannot be spent by a scanner reading the mail. */
async function generateAccess(type, email, redirectTo) {
  const data = await sb('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type, email, options: { redirect_to: redirectTo } }),
  });
  const props = (data && data.properties) || data || {};
  return {
    code: props.email_otp || null,
    link: props.action_link || null,
  };
}

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

module.exports = {
  SUPABASE_URL, SERVICE_KEY, ANON_KEY, RESEND_KEY, SITE, ADMIN_ORIGIN, FROM,
  missingConfig, send, cors, readJson, sb, requireAdmin,
  escapeHtml, markdownToHtml, fillTemplate, wrapEmail, sendEmail,
  generateAccess, isEmail,
};
