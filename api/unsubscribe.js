'use strict';

/* One-click unsubscribe. The token in the link is the subscriber's own
 * unsub_token, so no sign-in is involved and no address is exposed in the URL.
 * Responds with a plain page rather than JSON because a person clicks it. */

const L = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title, message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<meta name="robots" content="noindex, nofollow"><title>${L.escapeHtml(title)}</title></head>`
    + `<body style="margin:0;padding:48px 24px;background:#f7f8fa;`
    + `font:400 16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#17191d">`
    + `<div style="max-width:32rem;margin:0 auto;padding:2rem;background:#fff;border:1px solid #dfe2e7;border-radius:1rem">`
    + `<h1 style="margin:0 0 .6rem;font-size:1.5rem">${L.escapeHtml(title)}</h1>`
    + `<p style="margin:0 0 1.4rem;color:#555b65">${L.escapeHtml(message)}</p>`
    + `<a href="${L.SITE}" style="color:#7b1230;font-weight:700">Return to the website</a>`
    + `</div></body></html>`;
}

function html(res, status, title, message) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(status).end(page(title, message));
}

module.exports = async function handler(req, res) {
  // RFC 8058 one-click: mail clients POST here without the person seeing a page.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return L.send(res, 405, { error: 'Method not allowed.' });
  }

  const missing = L.missingConfig(['SUPABASE_URL', 'SERVICE_KEY']);
  if (missing.length) return html(res, 503, 'Not available', 'This service is not configured yet.');

  try {
    const url = new URL(req.url, 'https://local');
    const token = String(url.searchParams.get('token') || '').trim();
    if (!UUID.test(token)) {
      return html(res, 400, 'That link is not valid', 'Use the unsubscribe link from a recent message, or email the organizers.');
    }

    const rows = await L.sb(`/rest/v1/subscribers?unsub_token=eq.${encodeURIComponent(token)}&select=id,unsubscribed&limit=1`);
    const subscriber = Array.isArray(rows) ? rows[0] : null;
    // Same wording for an unknown token as for an already-unsubscribed one, so
    // the endpoint cannot be used to test whether a token exists.
    if (!subscriber) {
      return html(res, 200, 'You are unsubscribed', 'You will not receive further updates from the society.');
    }

    if (!subscriber.unsubscribed) {
      await L.sb(`/rest/v1/subscribers?id=eq.${encodeURIComponent(subscriber.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ unsubscribed: true, unsubscribed_at: new Date().toISOString() }),
      });
    }

    return html(res, 200, 'You are unsubscribed', 'You will not receive further updates from the society.');
  } catch (error) {
    console.error('[unsubscribe]', error);
    return html(res, 500, 'Something went wrong', 'Please email the organizers and we will remove you by hand.');
  }
};
