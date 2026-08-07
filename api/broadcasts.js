'use strict';

/* Newsletter drafting, scheduling, and sending.
 *
 * Sending is deliberately not a single long request. A broadcast moves to
 * 'sending' and then each run delivers as many recipients as it can before the
 * function's time budget runs out, recording one row per recipient. Whatever is
 * left is picked up by the next run (api/dispatch.js, on a cron). That keeps a
 * list of any size sendable from a 10-second function, and makes a retry after
 * a crash safe: a recipient with a delivery row is never sent to again. */

const L = require('./_lib');

const AUDIENCES = new Set(['subscribers', 'members', 'both']);
const SEND_BUDGET_MS = 7000;   // leave headroom inside the 10s function limit
const BATCH_SIZE = 50;         // Resend accepts up to 100 per batch call

function draftFields(body) {
  const draft = {
    subject: L.cleanText(body.subject, 180),
    preheader: L.cleanText(body.preheader, 240),
    body_markdown: String(body.body_markdown ?? '').slice(0, 20000),
    audience: AUDIENCES.has(body.audience) ? body.audience : 'subscribers',
  };
  if (!draft.subject) throw L.httpError(400, 'A subject line is required.');
  if (!draft.body_markdown.trim()) throw L.httpError(400, 'The message body is empty.');
  return draft;
}

function parseSchedule(value) {
  if (!value) return null;
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) throw L.httpError(400, 'That send time is not a valid date.');
  if (when.getTime() < Date.now() - 60 * 1000) throw L.httpError(400, 'Choose a send time in the future.');
  return when.toISOString();
}

async function getBroadcast(id) {
  const rows = await L.sb(`/rest/v1/broadcasts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const broadcast = Array.isArray(rows) ? rows[0] : null;
  if (!broadcast) throw L.httpError(404, 'That broadcast no longer exists.');
  return broadcast;
}

/* Everyone who has not unsubscribed, minus anyone already delivered to for this
 * broadcast. Ordered by id so the paging is stable across runs. */
async function pendingRecipients(broadcast, limit) {
  const delivered = await L.sb(
    `/rest/v1/broadcast_deliveries?broadcast_id=eq.${encodeURIComponent(broadcast.id)}&select=subscriber_id`
  );
  const done = new Set((delivered || []).map((row) => row.subscriber_id));

  let query = `/rest/v1/subscribers?unsubscribed=eq.false&select=id,email,full_name,unsub_token&order=id.asc&limit=${limit + done.size}`;
  if (broadcast.audience === 'members') query += '&confirmed=eq.true';
  const rows = await L.sb(query);
  return (rows || []).filter((row) => !done.has(row.id) && L.isEmail(row.email)).slice(0, limit);
}

function renderBody(broadcast, subscriber) {
  const name = (subscriber.full_name || '').trim().split(/\s+/)[0] || 'there';
  const filled = L.fillTemplate(broadcast.body_markdown, {
    name,
    full_name: subscriber.full_name || '',
    email: subscriber.email,
  });
  const unsubUrl = `${L.SITE}/api/unsubscribe?token=${encodeURIComponent(subscriber.unsub_token)}`;
  const preheader = broadcast.preheader
    ? `<p style="margin:0 0 14px;color:#555b65">${L.escapeHtml(broadcast.preheader)}</p>`
    : '';
  return L.wrapEmail({
    bodyHtml: preheader + L.markdownToHtml(filled),
    footerNote: 'Oberlin 3-2 Engineering Society, Oberlin College',
    actionUrl: unsubUrl,
    actionLabel: 'Unsubscribe from these updates',
  });
}

/* Deliver as many pending recipients as fit in the time budget. Returns what
 * happened so the caller can decide whether the broadcast is finished. */
async function deliver(broadcast, deadline) {
  let sent = 0;
  let failed = 0;
  let lastError = null;

  while (Date.now() < deadline) {
    const recipients = await pendingRecipients(broadcast, BATCH_SIZE);
    if (!recipients.length) return { sent, failed, lastError, remaining: false };

    for (const subscriber of recipients) {
      if (Date.now() >= deadline) return { sent, failed, lastError, remaining: true };
      let record;
      try {
        const result = await L.sendEmail({
          to: subscriber.email,
          subject: broadcast.subject,
          html: renderBody(broadcast, subscriber),
          replyTo: L.CONTACT,
          tag: 'broadcast',
        });
        record = { status: 'sent', resend_id: result?.id || null, error: null };
        sent += 1;
      } catch (error) {
        record = { status: 'failed', resend_id: null, error: L.cleanText(error.message, 400) };
        lastError = record.error;
        failed += 1;
      }
      // Written whether or not the send worked, so a permanently bad address
      // cannot wedge the broadcast by being retried forever.
      await L.sb('/rest/v1/broadcast_deliveries', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          broadcast_id: broadcast.id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          ...record,
        }),
      }).catch((error) => console.error('[broadcasts] delivery record failed', error.message));
    }
  }
  return { sent, failed, lastError, remaining: true };
}

async function runSend(broadcastId, deadline) {
  const broadcast = await getBroadcast(broadcastId);
  if (broadcast.status === 'sent') return { ok: true, status: 'sent', sent: 0, message: 'Already sent.' };

  await L.sb(`/rest/v1/broadcasts?id=eq.${encodeURIComponent(broadcast.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'sending' }),
  });

  const { sent, failed, lastError, remaining } = await deliver(broadcast, deadline);

  const totals = await L.sb(
    `/rest/v1/broadcast_deliveries?broadcast_id=eq.${encodeURIComponent(broadcast.id)}&select=status`
  );
  const delivered = (totals || []).filter((row) => row.status === 'sent').length;
  const failures = (totals || []).filter((row) => row.status === 'failed').length;

  const patch = {
    recipient_count: delivered,
    failed_count: failures,
    last_error: lastError,
  };
  if (!remaining) {
    patch.status = delivered > 0 || failures === 0 ? 'sent' : 'failed';
    patch.sent_at = new Date().toISOString();
  }
  await L.sb(`/rest/v1/broadcasts?id=eq.${encodeURIComponent(broadcast.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

  return {
    ok: true,
    status: patch.status || 'sending',
    sent,
    failed,
    delivered,
    remaining,
    message: remaining
      ? `Sent ${sent} so far. The rest continues automatically.`
      : `Sent to ${delivered} ${delivered === 1 ? 'person' : 'people'}.`,
  };
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res, 'GET, POST, PATCH, DELETE, OPTIONS')) return;

  const missing = L.missingConfig(['SUPABASE_URL', 'SERVICE_KEY', 'RESEND_KEY']);
  if (missing.length) return L.send(res, 503, { error: 'Email sending is not configured yet.' });

  try {
    const admin = await L.requireAdmin(req);
    const url = new URL(req.url, 'https://local');
    const id = L.cleanText(url.searchParams.get('id') || '', 60);
    const action = L.cleanText(url.searchParams.get('action') || '', 30);

    if (req.method === 'GET') {
      const rows = await L.sb('/rest/v1/broadcasts?select=*&order=created_at.desc&limit=100');
      const subscribers = await L.sb('/rest/v1/subscribers?unsubscribed=eq.false&select=id');
      return L.send(res, 200, { ok: true, broadcasts: rows || [], audienceSize: (subscribers || []).length });
    }

    if (req.method === 'POST' && !action) {
      const draft = draftFields(await L.readJson(req, 64 * 1024));
      const rows = await L.sb('/rest/v1/broadcasts', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...draft, status: 'draft', created_by: admin.id }),
      });
      return L.send(res, 201, { ok: true, broadcast: Array.isArray(rows) ? rows[0] : rows });
    }

    if (req.method === 'PATCH') {
      if (!id) return L.send(res, 400, { error: 'Which broadcast?' });
      const existing = await getBroadcast(id);
      if (existing.status === 'sent' || existing.status === 'sending') {
        return L.send(res, 409, { error: 'A broadcast that has started sending cannot be edited.' });
      }
      const draft = draftFields(await L.readJson(req, 64 * 1024));
      const rows = await L.sb(`/rest/v1/broadcasts?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(draft),
      });
      return L.send(res, 200, { ok: true, broadcast: Array.isArray(rows) ? rows[0] : rows });
    }

    if (req.method === 'DELETE') {
      if (!id) return L.send(res, 400, { error: 'Which broadcast?' });
      const existing = await getBroadcast(id);
      if (existing.status === 'sending') return L.send(res, 409, { error: 'This broadcast is currently sending.' });
      await L.sb(`/rest/v1/broadcasts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return L.send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && action === 'test') {
      if (!id) return L.send(res, 400, { error: 'Which broadcast?' });
      const broadcast = await getBroadcast(id);
      const to = admin.email;
      if (!L.isEmail(to)) return L.send(res, 400, { error: 'Your officer account has no usable email address.' });
      await L.sendEmail({
        to,
        subject: `[Test] ${broadcast.subject}`,
        html: renderBody(broadcast, {
          email: to,
          full_name: admin.full_name || '',
          unsub_token: '00000000-0000-0000-0000-000000000000',
        }),
        replyTo: L.CONTACT,
        tag: 'broadcast-test',
      });
      return L.send(res, 200, { ok: true, message: `Test sent to ${to}.` });
    }

    if (req.method === 'POST' && action === 'schedule') {
      if (!id) return L.send(res, 400, { error: 'Which broadcast?' });
      const existing = await getBroadcast(id);
      if (existing.status === 'sent' || existing.status === 'sending') {
        return L.send(res, 409, { error: 'This broadcast has already started sending.' });
      }
      const body = await L.readJson(req);
      const when = parseSchedule(body.scheduled_for);
      const rows = await L.sb(`/rest/v1/broadcasts?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(
          when
            ? { status: 'scheduled', scheduled_for: when }
            : { status: 'draft', scheduled_for: null }
        ),
      });
      return L.send(res, 200, {
        ok: true,
        broadcast: Array.isArray(rows) ? rows[0] : rows,
        message: when ? 'Scheduled.' : 'Returned to draft.',
      });
    }

    if (req.method === 'POST' && action === 'send') {
      if (!id) return L.send(res, 400, { error: 'Which broadcast?' });
      const result = await runSend(id, Date.now() + SEND_BUDGET_MS);
      return L.send(res, 200, result);
    }

    return L.send(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    if (L.missingSchemaFeature(error, 'broadcast_deliveries')) {
      return L.send(res, 503, { error: 'Run database/migrations/2026-08-07-broadcasts.sql, then try again.' });
    }
    // A rejected request is an answer, not a fault; only log real failures.
    if (!error.status || error.status >= 500) console.error('[broadcasts]', error);
    return L.send(res, error.status || 500, {
      error: error.status && error.status < 500 ? error.message : 'The broadcast could not be processed.',
    });
  }
};

module.exports.runSend = runSend;
module.exports.SEND_BUDGET_MS = SEND_BUDGET_MS;
