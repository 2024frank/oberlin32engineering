'use strict';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
process.env.SUPABASE_ANON_KEY = 'anon-test';
process.env.RESEND_API_KEY = 'resend-test';
process.env.SUBMISSION_SALT = 'submission-test-salt';

const assert = require('node:assert/strict');

function response(status, body) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function request(method, body = {}, headers = {}) {
  return {
    method,
    body,
    headers: {
      origin: 'https://www.oberlin32engineeringsociety.com',
      referer: 'https://www.oberlin32engineeringsociety.com/join',
      'user-agent': 'api-test',
      'x-forwarded-for': '192.0.2.10',
      ...headers
    },
    socket: { remoteAddress: '192.0.2.10' }
  };
}

function result() {
  const headers = {};
  return {
    headers,
    statusCode: 0,
    payload: null,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    end(raw = '') { this.payload = raw ? JSON.parse(raw) : null; }
  };
}

async function runHandler(handler, req) {
  const res = result();
  await handler(req, res);
  return res;
}

async function main() {
  const submit = require('../api/submit.js');
  const roles = require('../api/roles.js');
  const members = require('../api/members.js');

  // Public account-email requests reject cross-site origins before doing work.
  global.fetch = async () => { throw new Error('network should not be called'); };
  let res = await runHandler(members, request('POST', { action: 'reset', email: 'student@oberlin.edu' }, { origin: 'https://malicious.example' }));
  assert.equal(res.statusCode, 403);

  // Unknown types and non-Oberlin membership addresses fail before storage.
  global.fetch = async () => { throw new Error('network should not be called'); };
  res = await runHandler(submit, request('POST', { type: 'unknown', started_at: Date.now() - 3000 }));
  assert.equal(res.statusCode, 400);
  res = await runHandler(submit, request('POST', {
    type: 'membership_interest', full_name: 'Student', email: 'student@example.com', consent: 'yes', started_at: Date.now() - 3000
  }));
  assert.equal(res.statusCode, 400);

  // Honeypot submissions are discarded without touching the database.
  res = await runHandler(submit, request('POST', {
    type: 'contact', full_name: 'Bot', email: 'bot@example.com', message: 'spam', company: 'robots inc', started_at: Date.now() - 3000
  }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);

  // Current-schema submissions go through the rate-limited RPC.
  const rpcCalls = [];
  global.fetch = async (url, options = {}) => {
    rpcCalls.push({ url: String(url), options });
    if (String(url).includes('/rest/v1/rpc/accept_public_submission')) return response(200, 'submission-id');
    if (String(url).endsWith('/rest/v1/subscribers')) return response(201, []);
    if (String(url) === 'https://api.resend.com/emails') return response(200, { id: 'mail-id' });
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(submit, request('POST', {
    type: 'membership_interest', full_name: 'Test Student', email: 'student@oberlin.edu', class_year: '2028', consent: 'yes', started_at: Date.now() - 3000
  }));
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.ok, true);
  // Consenting to be contacted is what puts someone on the mailing list.
  const subscribeCall = rpcCalls.find((call) => call.url.endsWith('/rest/v1/subscribers'));
  assert.ok(subscribeCall, 'membership submission should add the person to subscribers');
  assert.equal(JSON.parse(subscribeCall.options.body).email, 'student@oberlin.edu');
  assert.match(subscribeCall.options.headers.Prefer, /ignore-duplicates/);
  assert.equal(rpcCalls.filter((call) => call.url.includes('/rest/v1/rpc/accept_public_submission')).length, 1);
  assert.equal(rpcCalls.filter((call) => call.url === 'https://api.resend.com/emails').length, 1);
  const rpcBody = JSON.parse(rpcCalls.find((call) => call.url.includes('/rest/v1/rpc/accept_public_submission')).options.body);
  assert.equal(rpcBody.p_type, 'membership_interest');
  assert.equal(rpcBody.p_email, 'student@oberlin.edu');
  assert.match(rpcBody.p_ip_hash, /^[a-f0-9]{64}$/);

  // During migration, a missing RPC falls back to the previous submissions table.
  const legacyCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    legacyCalls.push({ url: value, options });
    if (value.includes('/rest/v1/rpc/accept_public_submission')) return response(404, { code: 'PGRST202', message: 'Could not find the function accept_public_submission in the schema cache' });
    if (value.includes('/rest/v1/submissions?')) return response(200, []);
    if (value.endsWith('/rest/v1/submissions')) return response(201, [{ id: 'legacy-id' }]);
    if (value === 'https://api.resend.com/emails') return response(200, { id: 'legacy-mail-id' });
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(submit, request('POST', {
    type: 'contact', full_name: 'Visitor', email: 'visitor@example.com', message: 'Hello there', started_at: Date.now() - 3000
  }));
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.id, 'legacy-id');
  assert.equal(legacyCalls.filter((call) => call.url.includes('/rest/v1/submissions')).length, 2);
  assert.equal(legacyCalls.filter((call) => call.url === 'https://api.resend.com/emails').length, 1);
  const legacyInsert = legacyCalls.find((call) => call.url.endsWith('/rest/v1/submissions'));
  const legacyRow = JSON.parse(legacyInsert.options.body);
  assert.equal(legacyRow.payload._meta.compatibility_mode, true);

  // Role writes require an admin, tolerate the pre-migration profile schema,
  // and clamp unsafe numeric input.
  const roleCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    roleCalls.push({ url: value, options });
    if (value.endsWith('/auth/v1/user')) return response(200, { id: 'admin-id', email: 'admin@oberlin.edu' });
    if (value.includes('/rest/v1/profiles?') && value.includes('society_role_id')) {
      return response(400, { code: 'PGRST204', message: "Could not find the 'society_role_id' column of 'profiles' in the schema cache" });
    }
    if (value.includes('/rest/v1/profiles?')) return response(200, [{ id: 'admin-id', role: 'admin', email: 'admin@oberlin.edu' }]);
    if (value.endsWith('/rest/v1/society_roles')) return response(201, [{ id: 'role-id', label: 'Projects Chair' }]);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(roles, request('POST', { label: 'Projects Chair', seats: 999, access_level: 'editor' }, { authorization: 'Bearer valid' }));
  assert.equal(res.statusCode, 201);
  const roleCreate = roleCalls.find((call) => call.url.endsWith('/rest/v1/society_roles'));
  assert.equal(JSON.parse(roleCreate.options.body).seats, 50);

  // Reset requests return a generic result when no matching account exists.
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes('/rest/v1/rpc/allow_account_email')) return response(200, true);
    if (value.includes('/rest/v1/profiles?')) return response(200, []);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(members, request('POST', { action: 'reset', email: 'nobody@oberlin.edu' }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { ok: true });

  // A deployment made before the SQL migration still uses bounded, in-process
  // account-email limits instead of disabling password recovery or invitations.
  let fallbackProfileChecks = 0;
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes('/rest/v1/rpc/allow_account_email')) {
      return response(404, { code: 'PGRST202', message: 'Could not find the function allow_account_email in the schema cache' });
    }
    if (value.includes('/rest/v1/profiles?')) { fallbackProfileChecks += 1; return response(200, []); }
    throw new Error(`unexpected request: ${url}`);
  };
  for (let index = 0; index < 4; index += 1) {
    res = await runHandler(members, request('POST', { action: 'reset', email: 'cutover@oberlin.edu' }));
    assert.equal(res.statusCode, 200);
  }
  assert.equal(fallbackProfileChecks, 3);

  // Invitations survive the schema cutover without granting access before the
  // recipient accepts. New invitation metadata is retried against the old table.
  const inviteCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    inviteCalls.push({ url: value, options });
    if (value.endsWith('/auth/v1/user')) return response(200, { id: 'admin-id', email: 'admin@oberlin.edu' });
    if (value.includes('/rest/v1/profiles?') && value.includes('id=eq.admin-id') && value.includes('society_role_id')) {
      return response(400, { code: 'PGRST204', message: "Could not find the 'society_role_id' column of 'profiles' in the schema cache" });
    }
    if (value.includes('/rest/v1/profiles?') && value.includes('id=eq.admin-id')) {
      return response(200, [{ id: 'admin-id', role: 'admin', email: 'admin@oberlin.edu', full_name: 'Admin' }]);
    }
    if (value.includes('/rest/v1/society_roles?')) {
      return response(200, [{ id: 'projects-role', label: 'Projects Coordinator', access_level: 'editor', seats: 2, active: true }]);
    }
    if (value.includes('/rest/v1/profiles?society_role_id=')) {
      return response(400, { code: 'PGRST204', message: "Could not find the 'society_role_id' column of 'profiles' in the schema cache" });
    }
    if (value.includes('/rest/v1/invitations?role_id=')) return response(200, []);
    if (value.includes('/rest/v1/rpc/allow_account_email')) {
      return response(404, { code: 'PGRST202', message: 'Could not find the function allow_account_email in the schema cache' });
    }
    if (value.endsWith('/auth/v1/admin/generate_link')) {
      return response(200, { properties: { email_otp: '123456', action_link: 'https://example.supabase.co/auth/v1/verify?token=stub' }, user: { id: 'new-user', user_metadata: {} } });
    }
    if (value === 'https://api.resend.com/emails') return response(200, { id: 'invite-mail' });
    if (value.includes('/rest/v1/invitations?email=')) return response(200, []);
    if (value.endsWith('/rest/v1/invitations')) {
      const row = JSON.parse(options.body);
      if ('auth_user_id' in row) {
        return response(400, { code: 'PGRST204', message: "Could not find the 'auth_user_id' column of 'invitations' in the schema cache" });
      }
      return response(201, [{ id: 'invite-id' }]);
    }
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(members, request('POST', {
    action: 'invite', email: 'new-officer@oberlin.edu', full_name: 'New Officer', role_id: 'projects-role'
  }, { authorization: 'Bearer valid' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.invited, 'new-officer@oberlin.edu');
  assert.equal(inviteCalls.filter((call) => call.url.includes('/rest/v1/profiles?on_conflict=id')).length, 0);
  const invitationWrites = inviteCalls.filter((call) => call.url.endsWith('/rest/v1/invitations'));
  assert.equal(invitationWrites.length, 2);
  assert.equal(JSON.parse(invitationWrites[0].options.body).auth_user_id, 'new-user');
  assert.equal('auth_user_id' in JSON.parse(invitationWrites[1].options.body), false);

  // The migrated database claims an invitation atomically. No browser-side
  // profile write is needed, so a simultaneous revoke cannot race this path.
  const atomicAcceptanceCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    atomicAcceptanceCalls.push({ url: value, options });
    if (value.endsWith('/auth/v1/user')) return response(200, { id: 'new-user', email: 'new-officer@oberlin.edu', user_metadata: { full_name: 'New Officer' } });
    if (value.includes('/rest/v1/rpc/accept_officer_invitation')) return response(200, true);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(members, request('POST', { action: 'accept_self' }, { authorization: 'Bearer accepted-session' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.accepted, true);
  assert.equal(atomicAcceptanceCalls.filter((call) => call.url.includes('/rest/v1/profiles')).length, 0);

  // Before the migration, acceptance still works through a guarded compatibility
  // path. It creates the profile only after a pending invitation is found and
  // removes a newly-created profile if another request revoked the invitation.
  const fallbackAcceptanceCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    fallbackAcceptanceCalls.push({ url: value, options });
    if (value.endsWith('/auth/v1/user')) return response(200, { id: 'new-user', email: 'new-officer@oberlin.edu', user_metadata: { full_name: 'New Officer' } });
    if (value.includes('/rest/v1/rpc/accept_officer_invitation')) {
      return response(404, { code: 'PGRST202', message: 'Could not find the function accept_officer_invitation in the schema cache' });
    }
    if (value.includes('/rest/v1/profiles?id=eq.new-user&select=id')) return response(200, []);
    if (value.includes('/rest/v1/invitations?email=ilike.')) {
      return response(200, [{ id: 'invite-id', email: 'new-officer@oberlin.edu', full_name: 'New Officer', role_id: 'projects-role', access_level: 'editor' }]);
    }
    if (value.includes('/rest/v1/profiles?on_conflict=id')) {
      const row = JSON.parse(options.body);
      if ('society_role_id' in row) {
        return response(400, { code: 'PGRST204', message: "Could not find the 'society_role_id' column of 'profiles' in the schema cache" });
      }
      return response(201, null);
    }
    if (value.includes('/rest/v1/invitations?id=eq.invite-id') && options.method === 'PATCH') {
      return response(200, [{ id: 'invite-id', status: 'accepted' }]);
    }
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(members, request('POST', { action: 'accept_self' }, { authorization: 'Bearer accepted-session' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.accepted, true);
  const acceptedProfileWrites = fallbackAcceptanceCalls.filter((call) => call.url.includes('/rest/v1/profiles?on_conflict=id'));
  assert.equal(acceptedProfileWrites.length, 2);
  assert.equal('society_role_id' in JSON.parse(acceptedProfileWrites[1].options.body), false);

  // Revocation is also atomic after migration and removes a generated Auth user
  // only when the invitation did not reuse a pre-existing account.
  const revokeCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    revokeCalls.push({ url: value, options });
    if (value.endsWith('/auth/v1/user')) return response(200, { id: 'admin-id', email: 'admin@oberlin.edu' });
    if (value.includes('/rest/v1/profiles?') && value.includes('id=eq.admin-id')) return response(200, [{ id: 'admin-id', role: 'admin', email: 'admin@oberlin.edu' }]);
    if (value.includes('/rest/v1/rpc/revoke_officer_invitation')) {
      return response(200, [{ revoked: true, auth_user_id: 'generated-user', existing_account: false }]);
    }
    if (value.endsWith('/auth/v1/admin/users/generated-user') && options.method === 'DELETE') return response(200, null);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(members, request('POST', { action: 'revoke', id: 'revoke-id' }, { authorization: 'Bearer valid' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.cleanupPending, false);
  assert.equal(revokeCalls.filter((call) => call.url.endsWith('/auth/v1/admin/users/generated-user')).length, 1);
  assert.equal(revokeCalls.filter((call) => call.url.includes('/rest/v1/invitations?id=eq.revoke-id')).length, 0);

  // The old-schema fallback never reports success when a competing acceptance
  // already changed the invitation, and it does not delete an account in that case.
  const lostRaceCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    lostRaceCalls.push({ url: value, options });
    if (value.endsWith('/auth/v1/user')) return response(200, { id: 'admin-id', email: 'admin@oberlin.edu' });
    if (value.includes('/rest/v1/profiles?') && value.includes('id=eq.admin-id')) return response(200, [{ id: 'admin-id', role: 'admin', email: 'admin@oberlin.edu' }]);
    if (value.includes('/rest/v1/rpc/revoke_officer_invitation')) {
      return response(404, { code: 'PGRST202', message: 'Could not find the function revoke_officer_invitation in the schema cache' });
    }
    if (value.includes('/rest/v1/invitations?id=eq.race-id') && options.method !== 'PATCH') {
      return response(200, [{ id: 'race-id', email: 'raced@oberlin.edu', status: 'sent', auth_user_id: 'generated-user', existing_account: false }]);
    }
    if (value.includes('/rest/v1/invitations?id=eq.race-id') && options.method === 'PATCH') return response(200, []);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(members, request('POST', { action: 'revoke', id: 'race-id' }, { authorization: 'Bearer valid' }));
  assert.equal(res.statusCode, 409);
  assert.equal(lostRaceCalls.filter((call) => call.url.includes('/auth/v1/admin/users/')).length, 0);

  // --- Newsletters -------------------------------------------------------
  const broadcasts = require('../api/broadcasts.js');
  const dispatch = require('../api/dispatch.js');
  const unsubscribe = require('../api/unsubscribe.js');

  const BROADCAST = {
    id: 'bc-1', subject: 'First update', preheader: 'What we are doing',
    body_markdown: 'Hi {{name}}, here is the news.', audience: 'subscribers',
    status: 'draft', recipient_count: 0
  };
  const SUBSCRIBERS = [
    { id: 'sub-1', email: 'one@oberlin.edu', full_name: 'One Person', unsub_token: '11111111-1111-4111-8111-111111111111' },
    { id: 'sub-2', email: 'two@oberlin.edu', full_name: 'Two Person', unsub_token: '22222222-2222-4222-8222-222222222222' }
  ];

  function broadcastBackend({ deliveredIds = [], failEmails = [] } = {}) {
    const calls = [];
    const delivered = new Set(deliveredIds);
    global.fetch = async (url, options = {}) => {
      const value = String(url);
      calls.push({ url: value, options });
      if (value.endsWith('/auth/v1/user')) return response(200, { id: 'admin-id', email: 'admin@oberlin.edu' });
      if (value.includes('/rest/v1/profiles?') && value.includes('id=eq.admin-id')) {
        return response(200, [{ id: 'admin-id', role: 'admin', email: 'admin@oberlin.edu', full_name: 'Admin' }]);
      }
      if (value.includes('/rest/v1/broadcasts?id=eq.bc-1') && options.method === 'PATCH') return response(200, []);
      if (value.includes('/rest/v1/broadcasts?id=eq.bc-1')) return response(200, [BROADCAST]);
      if (value.includes('/rest/v1/broadcast_deliveries') && options.method === 'POST') {
        delivered.add(JSON.parse(options.body).subscriber_id);
        return response(201, []);
      }
      if (value.includes('/rest/v1/broadcast_deliveries')) {
        return response(200, [...delivered].map((id) => ({
          subscriber_id: id,
          status: failEmails.includes(SUBSCRIBERS.find((s) => s.id === id)?.email) ? 'failed' : 'sent'
        })));
      }
      if (value.includes('/rest/v1/subscribers')) return response(200, SUBSCRIBERS);
      if (value === 'https://api.resend.com/emails') {
        const to = JSON.parse(options.body).to[0];
        if (failEmails.includes(to)) return response(422, { message: 'Invalid recipient' });
        return response(200, { id: `mail-${to}` });
      }
      throw new Error(`unexpected request: ${url}`);
    };
    return calls;
  }

  // A send delivers one message per subscriber, personalised, each carrying its
  // own unsubscribe token.
  let calls = broadcastBackend();
  res = await runHandler(broadcasts, { ...request('POST', {}, { authorization: 'Bearer valid' }), url: '/api/broadcasts?id=bc-1&action=send' });
  assert.equal(res.statusCode, 200);
  const sends = calls.filter((call) => call.url === 'https://api.resend.com/emails').map((call) => JSON.parse(call.options.body));
  assert.equal(sends.length, 2);
  assert.ok(sends[0].html.includes('Hi One'), 'first name should be filled in');
  assert.ok(sends[0].html.includes('11111111-1111-4111-8111-111111111111'), 'unsubscribe token should be per recipient');
  assert.ok(sends[1].html.includes('22222222-2222-4222-8222-222222222222'));
  assert.equal(res.payload.status, 'sent');

  // Anyone already delivered to is skipped, which is what makes a resumed or
  // retried send safe.
  calls = broadcastBackend({ deliveredIds: ['sub-1'] });
  res = await runHandler(broadcasts, { ...request('POST', {}, { authorization: 'Bearer valid' }), url: '/api/broadcasts?id=bc-1&action=send' });
  assert.equal(res.statusCode, 200);
  const resend = calls.filter((call) => call.url === 'https://api.resend.com/emails').map((call) => JSON.parse(call.options.body).to[0]);
  assert.deepEqual(resend, ['two@oberlin.edu']);

  // A rejected address is recorded as failed rather than retried forever.
  calls = broadcastBackend({ failEmails: ['one@oberlin.edu'] });
  res = await runHandler(broadcasts, { ...request('POST', {}, { authorization: 'Bearer valid' }), url: '/api/broadcasts?id=bc-1&action=send' });
  assert.equal(res.statusCode, 200);
  const failureRecord = calls
    .filter((call) => call.url.includes('/rest/v1/broadcast_deliveries') && call.options.method === 'POST')
    .map((call) => JSON.parse(call.options.body))
    .find((row) => row.email === 'one@oberlin.edu');
  assert.equal(failureRecord.status, 'failed');

  // Sending is admin-only.
  global.fetch = async (url) => {
    if (String(url).endsWith('/auth/v1/user')) return response(200, { id: 'editor-id', email: 'editor@oberlin.edu' });
    if (String(url).includes('/rest/v1/profiles?')) return response(200, [{ id: 'editor-id', role: 'editor', email: 'editor@oberlin.edu' }]);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(broadcasts, { ...request('POST', {}, { authorization: 'Bearer valid' }), url: '/api/broadcasts?id=bc-1&action=send' });
  assert.equal(res.statusCode, 403);

  // The cron endpoint refuses callers without the shared secret, and refuses
  // everyone when no secret is configured at all.
  delete process.env.CRON_SECRET;
  global.fetch = async () => { throw new Error('network should not be called'); };
  res = await runHandler(dispatch, { ...request('GET', {}, { authorization: 'Bearer anything' }), url: '/api/dispatch' });
  assert.equal(res.statusCode, 401);
  process.env.CRON_SECRET = 'cron-secret-value';
  res = await runHandler(dispatch, { ...request('GET', {}, { authorization: 'Bearer wrong-length' }), url: '/api/dispatch' });
  assert.equal(res.statusCode, 401);

  // With the secret it picks up due and part-sent broadcasts.
  const dispatchCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    dispatchCalls.push({ url: value, options });
    if (value.includes('/rest/v1/broadcasts?or=')) return response(200, []);
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(dispatch, { ...request('GET', {}, { authorization: 'Bearer cron-secret-value' }), url: '/api/dispatch' });
  assert.equal(res.statusCode, 200);
  assert.ok(dispatchCalls.some((call) => call.url.includes('status.eq.sending')), 'a part-sent broadcast should be resumed');

  // Unsubscribing needs only the token, and an unknown token is answered the
  // same way as a real one so the endpoint cannot be used to probe for tokens.
  const unsubCalls = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    unsubCalls.push({ url: value, options });
    if (value.includes('unsub_token=eq.11111111-1111-4111-8111-111111111111')) {
      return response(200, [{ id: 'sub-1', unsubscribed: false }]);
    }
    if (value.includes('/rest/v1/subscribers?id=eq.sub-1')) return response(200, []);
    if (value.includes('unsub_token=eq.')) return response(200, []);
    throw new Error(`unexpected request: ${url}`);
  };
  const htmlResult = () => { const r = result(); r.end = function (raw = '') { this.payload = raw; }; return r; };
  let page = htmlResult();
  await unsubscribe({ ...request('GET'), url: '/api/unsubscribe?token=11111111-1111-4111-8111-111111111111' }, page);
  assert.equal(page.statusCode, 200);
  assert.ok(unsubCalls.some((call) => call.options.method === 'PATCH' && JSON.parse(call.options.body).unsubscribed === true));
  const knownBody = page.payload;

  page = htmlResult();
  await unsubscribe({ ...request('GET'), url: '/api/unsubscribe?token=99999999-9999-4999-8999-999999999999' }, page);
  assert.equal(page.payload, knownBody, 'an unknown token must be indistinguishable from a real one');

  page = htmlResult();
  await unsubscribe({ ...request('GET'), url: '/api/unsubscribe?token=not-a-uuid' }, page);
  assert.equal(page.statusCode, 400);

  console.log('API tests passed: validation, storage, cutover compatibility, atomic invitation access, revocation, roles, reset privacy, and newsletter sending.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
