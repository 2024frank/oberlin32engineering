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
    if (String(url) === 'https://api.resend.com/emails') return response(200, { id: 'mail-id' });
    throw new Error(`unexpected request: ${url}`);
  };
  res = await runHandler(submit, request('POST', {
    type: 'membership_interest', full_name: 'Test Student', email: 'student@oberlin.edu', class_year: '2028', consent: 'yes', started_at: Date.now() - 3000
  }));
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.ok, true);
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
      return response(200, { properties: { email_otp: '123456' }, user: { id: 'new-user', user_metadata: {} } });
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

  console.log('API tests passed: validation, storage, cutover compatibility, atomic invitation access, revocation, roles, and reset privacy.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
