'use strict';

const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE = 'https://www.oberlin32engineeringsociety.com';
const APEX_SITE = 'https://oberlin32engineeringsociety.com';
const ADMIN_ORIGIN = 'https://admin.oberlin32engineeringsociety.com';
const FROM = process.env.RESEND_FROM_EMAIL || 'Oberlin 3-2 Engineering Society <hello@uhurued.com>';
const CONTACT = process.env.CONTACT_EMAIL || 'fkusiapp@oberlin.edu';

function missingConfig(required = ['SUPABASE_URL', 'SERVICE_KEY', 'RESEND_KEY']) {
  const values = { SUPABASE_URL, SERVICE_KEY, ANON_KEY, RESEND_KEY };
  return required.filter((name) => !values[name]);
}

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.status(status).end(JSON.stringify(body));
}

function allowedOrigin(origin) {
  if (!origin) return false;
  if (origin === SITE || origin === APEX_SITE || origin === ADMIN_ORIGIN) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function cors(req, res, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  const origin = req.headers.origin;
  if (allowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readJson(req, maxBytes = 16 * 1024) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    const bytes = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    if (bytes > maxBytes) throw httpError(413, 'Request is too large.');
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw httpError(413, 'Request is too large.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw httpError(400, 'Request body must be valid JSON.'); }
}

async function sb(path, options = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw httpError(503, 'Database configuration is incomplete.');
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data && (data.message || data.msg || data.error_description || data.hint);
    const error = httpError(response.status, message || `Database request failed (${response.status}).`);
    error.detail = data;
    throw error;
  }
  return data;
}

async function requireUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw httpError(401, 'Sign in required.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY || SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw httpError(401, 'Session expired. Sign in again.');
  return response.json();
}

function missingSchemaFeature(error, feature = '') {
  const detail = error?.detail || {};
  const code = String(detail.code || '');
  const text = [error?.message, detail.message, detail.details, detail.hint, code]
    .filter(Boolean).join(' ').toLowerCase();
  const target = String(feature || '').toLowerCase();
  const missing = ['PGRST202', 'PGRST204', '42703', '42883', '42P01'].includes(code)
    || /schema cache|could not find|does not exist|undefined (?:column|function|table)/i.test(text);
  return missing && (!target || text.includes(target));
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  const base = `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`;
  let rows;
  try {
    rows = await sb(`${base}&select=id,email,full_name,role,society_role_id`);
  } catch (error) {
    if (!missingSchemaFeature(error, 'society_role_id')) throw error;
    rows = await sb(`${base}&select=id,email,full_name,role`);
    if (Array.isArray(rows)) rows = rows.map((row) => ({ ...row, society_role_id: null }));
  }
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile || profile.role !== 'admin') throw httpError(403, 'Administrator access required.');
  return profile;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function markdownToHtml(markdown) {
  return escapeHtml(markdown)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function fillTemplate(text, vars) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? String(vars[key]) : ''));
}

/* No logo image, deliberately.
 *
 * The emblem was loaded from oberlin32engineeringsociety.com, which Google
 * Workspace treats as an oberlin.edu lookalike. Referencing that domain in the
 * message body reintroduced the filtering that moving the sender to
 * uhurued.com had just fixed, and the mail was purged after delivery. Text
 * only, so nothing in the message points at the flagged domain. */
function wrapEmail({ bodyHtml, actionUrl, actionLabel, footerNote }) {
  const action = actionUrl ? `<p style="margin:18px 0"><a href="${escapeHtml(actionUrl)}" style="color:#7b1230;font-weight:700">${escapeHtml(actionLabel || 'Continue')}</a></p>` : '';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff"><div style="max-width:540px;font:400 15px/1.65 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#17191d">${bodyHtml}${action}<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #dfe2e7;font-size:13px;color:#707782">${escapeHtml(footerNote || 'Oberlin 3-2 Engineering Society, Oberlin College')}</p></div></body></html>`;
}

async function sendEmail({ to, subject, html, replyTo, tag }) {
  if (!RESEND_KEY) throw httpError(503, 'Email service is not configured.');
  const payload = { from: FROM, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;
  if (tag) payload.tags = [{ name: 'kind', value: tag }];
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'oberlin32engineeringsociety.com (+https://www.oberlin32engineeringsociety.com)',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = httpError(502, data.message || `Email service failed (${response.status}).`);
    error.detail = data;
    throw error;
  }
  return data;
}

async function generateAccess(type, email, redirectTo) {
  const data = await sb('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type, email, options: { redirect_to: redirectTo } }),
  });
  const properties = (data && data.properties) || data || {};
  return {
    code: properties.email_otp || null,
    link: properties.action_link || null,
    user: data?.user || properties?.user || null,
  };
}

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = {
  SUPABASE_URL, SERVICE_KEY, ANON_KEY, RESEND_KEY, SITE, APEX_SITE, ADMIN_ORIGIN, FROM, CONTACT,
  missingConfig, send, cors, allowedOrigin, readJson, sb, requireUser, requireAdmin, missingSchemaFeature, httpError,
  escapeHtml, markdownToHtml, fillTemplate, wrapEmail, sendEmail,
  generateAccess, isEmail, cleanText, clientIp, sha256,
};
