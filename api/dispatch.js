'use strict';

/* Cron entry point. Vercel calls this on the schedule in vercel.json with
 * `Authorization: Bearer $CRON_SECRET`. It picks up broadcasts whose send time
 * has arrived, plus any that ran out of function time mid-send, and continues
 * them. Everything about actually sending lives in api/broadcasts.js. */

const L = require('./_lib');
const { runSend, SEND_BUDGET_MS } = require('./broadcasts');

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  // Without a configured secret this endpoint would let anyone trigger a send,
  // so it stays closed rather than open.
  if (!secret) return false;
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token.length !== secret.length) return false;
  return require('node:crypto').timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return L.send(res, 405, { error: 'Method not allowed.' });
  }
  if (!authorized(req)) return L.send(res, 401, { error: 'Unauthorized.' });

  const missing = L.missingConfig(['SUPABASE_URL', 'SERVICE_KEY', 'RESEND_KEY']);
  if (missing.length) return L.send(res, 503, { error: 'Email sending is not configured yet.' });

  try {
    const now = new Date().toISOString();
    const due = await L.sb(
      '/rest/v1/broadcasts'
      + `?or=(and(status.eq.scheduled,scheduled_for.lte.${now}),status.eq.sending)`
      + '&select=id,subject&order=scheduled_for.asc&limit=5'
    );

    const results = [];
    const deadline = Date.now() + SEND_BUDGET_MS;
    for (const broadcast of due || []) {
      // One broadcast at a time; whatever does not fit waits for the next tick.
      if (Date.now() >= deadline) break;
      try {
        const result = await runSend(broadcast.id, deadline);
        results.push({ id: broadcast.id, subject: broadcast.subject, ...result });
      } catch (error) {
        console.error('[dispatch]', broadcast.id, error.message);
        results.push({ id: broadcast.id, error: error.message });
      }
    }

    return L.send(res, 200, { ok: true, considered: (due || []).length, results });
  } catch (error) {
    if (L.missingSchemaFeature(error, 'broadcast_deliveries')) {
      return L.send(res, 503, { error: 'Broadcast tables are missing. Run the broadcasts migration.' });
    }
    console.error('[dispatch]', error);
    return L.send(res, 500, { error: 'Scheduled sending failed.' });
  }
};
