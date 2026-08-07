'use strict';

const L = require('./_lib.js');

const SETUP_REDIRECT = `${L.ADMIN_ORIGIN}/?welcome=1`;
const RESET_REDIRECT = `${L.ADMIN_ORIGIN}/?reset=1`;
const localEmailEvents = [];
let warnedMissingEmailLimit = false;

function localAccountEmailLimit(emailHash, ipHash, kind) {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (let index = localEmailEvents.length - 1; index >= 0; index -= 1) {
    if (localEmailEvents[index].at < cutoff) localEmailEvents.splice(index, 1);
  }
  const emailCount = localEmailEvents.filter((event) => event.emailHash === emailHash && event.kind === kind).length;
  const ipCount = localEmailEvents.filter((event) => event.ipHash === ipHash).length;
  if (emailCount >= 3 || ipCount >= 10) return false;
  localEmailEvents.push({ emailHash, ipHash, kind, at: Date.now() });
  return true;
}

async function maySendAccountEmail(req, email, kind) {
  const salt = process.env.SUBMISSION_SALT || L.SERVICE_KEY;
  const emailHash = L.sha256(`${salt}:${email}`);
  const ipHash = L.sha256(`${salt}:${L.clientIp(req)}`);
  try {
    const result = await L.sb('/rest/v1/rpc/allow_account_email', {
      method: 'POST',
      body: JSON.stringify({ p_email_hash: emailHash, p_ip_hash: ipHash, p_kind: kind })
    });
    return Array.isArray(result) ? Boolean(result[0]) : Boolean(result);
  } catch (error) {
    if (L.missingSchemaFeature(error, 'allow_account_email')) {
      if (!warnedMissingEmailLimit) {
        console.warn('[members] using temporary in-process email limits until the database migration is applied');
        warnedMissingEmailLimit = true;
      }
      return localAccountEmailLimit(emailHash, ipHash, kind);
    }
    console.error('[members] email rate-limit check failed', error.message);
    return false;
  }
}

function resetEmail(name, link) {
  return L.wrapEmail({
    bodyHtml:
      `<p>Hi ${L.escapeHtml(name)},</p>` +
      `<p>Use the link below to choose a new password for the officer portal. It works once and lasts an hour.</p>` +
      `<p>If you did not ask for this, you can ignore this message and nothing will change.</p>`,
    actionUrl: link,
    actionLabel: 'Choose a new password',
    footerNote: 'Oberlin 3-2 Engineering Society, Oberlin College'
  });
}

function invitationEmail(name, role, description, link, note, inviter) {
  const safeName = L.escapeHtml(name);
  const safeRole = L.escapeHtml(role);
  const duties = description ? `<p>${L.escapeHtml(description)}</p>` : '';
  const extra = note ? `<p>${L.escapeHtml(note)}</p>` : '';
  const from = inviter ? `<p>${L.escapeHtml(inviter)}</p>` : '';
  return L.wrapEmail({
    bodyHtml:
      `<p>Hi ${safeName},</p>` +
      `<p>Welcome to the Oberlin 3-2 Engineering Society. You are joining the organizing team as <strong>${safeRole}</strong>.</p>` +
      duties +
      extra +
      `<p>Set up your account and choose a password to get started. The link works once and lasts an hour.</p>`,
    actionUrl: link,
    actionLabel: 'Set up your account',
    footerNote: 'Oberlin 3-2 Engineering Society, Oberlin College'
  }).replace('</div></body>', (from ? from : '') + '</div></body>');
}

async function seatUsage(roleId, email) {
  let profiles = [];
  try {
    profiles = await L.sb(`/rest/v1/profiles?society_role_id=eq.${encodeURIComponent(roleId)}&select=id,email`);
  } catch (error) {
    if (!L.missingSchemaFeature(error, 'society_role_id')) throw error;
  }
  const invites = await L.sb(`/rest/v1/invitations?role_id=eq.${encodeURIComponent(roleId)}&status=eq.sent&select=id,email`);
  const excluded = email.toLowerCase();
  const occupants = new Set();
  [...(profiles || []), ...(invites || [])].forEach((item) => {
    const value = String(item.email || '').toLowerCase();
    if (value && value !== excluded) occupants.add(value);
  });
  return occupants.size;
}

async function listProfiles() {
  try {
    return await L.sb('/rest/v1/profiles?select=id,email,full_name,role,society_role_id,created_at&order=created_at.asc');
  } catch (error) {
    if (!L.missingSchemaFeature(error, 'society_role_id')) throw error;
    const rows = await L.sb('/rest/v1/profiles?select=id,email,full_name,role,created_at&order=created_at.asc');
    return Array.isArray(rows) ? rows.map((row) => ({ ...row, society_role_id: null })) : rows;
  }
}

async function upsertProfile(record) {
  const options = {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
  };
  try {
    return await L.sb('/rest/v1/profiles?on_conflict=id', { ...options, body: JSON.stringify(record) });
  } catch (error) {
    if (!L.missingSchemaFeature(error, 'society_role_id')) throw error;
    const compatible = { ...record };
    delete compatible.society_role_id;
    return L.sb('/rest/v1/profiles?on_conflict=id', { ...options, body: JSON.stringify(compatible) });
  }
}

async function acceptInvitation(user, email) {
  const fullName = L.cleanText(user.user_metadata?.full_name || email.split('@')[0], 120);
  try {
    const result = await L.sb('/rest/v1/rpc/accept_officer_invitation', {
      method: 'POST',
      body: JSON.stringify({ p_user_id: user.id, p_email: email, p_full_name: fullName })
    });
    return Array.isArray(result) ? Boolean(result[0]) : Boolean(result);
  } catch (error) {
    if (!L.missingSchemaFeature(error, 'accept_officer_invitation')) throw error;
  }

  // Temporary compatibility path for deployments that have not run the new
  // SQL migration yet. The migrated RPC performs this claim atomically.
  const previous = await L.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id`);
  const hadProfile = Array.isArray(previous) && Boolean(previous[0]);
  const invitations = await L.sb(`/rest/v1/invitations?email=ilike.${encodeURIComponent(email)}&status=eq.sent&select=id,email,full_name,role_id,access_level&order=sent_at.desc&limit=1`);
  const invitation = Array.isArray(invitations) ? invitations[0] : null;
  if (!invitation) return false;

  await upsertProfile({
    id: user.id,
    email,
    full_name: L.cleanText(invitation.full_name || fullName, 120),
    role: invitation.access_level === 'admin' ? 'admin' : 'editor',
    society_role_id: invitation.role_id || null,
    updated_at: new Date().toISOString()
  });
  const claimed = await L.sb(`/rest/v1/invitations?id=eq.${encodeURIComponent(invitation.id)}&status=eq.sent`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'accepted', accepted_at: new Date().toISOString() })
  });
  const accepted = Array.isArray(claimed) && claimed.length > 0;
  if (!accepted && !hadProfile) {
    try { await L.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE' }); }
    catch (cleanupError) { console.error('[members] invitation claim lost but profile cleanup failed', cleanupError.message); }
  }
  return accepted;
}

async function saveInvitation(existingId, record) {
  const path = existingId
    ? `/rest/v1/invitations?id=eq.${encodeURIComponent(existingId)}`
    : '/rest/v1/invitations';
  const method = existingId ? 'PATCH' : 'POST';
  try {
    return await L.sb(path, { method, body: JSON.stringify(record) });
  } catch (error) {
    const missingAccessMetadata = L.missingSchemaFeature(error, 'auth_user_id')
      || L.missingSchemaFeature(error, 'existing_account');
    if (!missingAccessMetadata) throw error;
    const compatible = { ...record };
    delete compatible.auth_user_id;
    delete compatible.existing_account;
    return L.sb(path, { method, body: JSON.stringify(compatible) });
  }
}

async function invitationForRevoke(id) {
  const base = `/rest/v1/invitations?id=eq.${encodeURIComponent(id)}`;
  try {
    const rows = await L.sb(`${base}&select=id,email,status,auth_user_id,existing_account`);
    return Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    const missingAccessMetadata = L.missingSchemaFeature(error, 'auth_user_id')
      || L.missingSchemaFeature(error, 'existing_account');
    if (!missingAccessMetadata) throw error;
    const rows = await L.sb(`${base}&select=id,email,status`);
    const invitation = Array.isArray(rows) ? rows[0] : null;
    return invitation ? { ...invitation, auth_user_id: null, existing_account: true } : null;
  }
}

async function deleteGeneratedUser(userId) {
  if (!userId) return;
  await L.sb(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

async function revokeInvitation(id) {
  try {
    const result = await L.sb('/rest/v1/rpc/revoke_officer_invitation', {
      method: 'POST',
      body: JSON.stringify({ p_invitation_id: id })
    });
    const row = Array.isArray(result) ? result[0] : result;
    return {
      revoked: Boolean(row?.revoked),
      auth_user_id: row?.auth_user_id || null,
      existing_account: row?.existing_account !== false
    };
  } catch (error) {
    if (!L.missingSchemaFeature(error, 'revoke_officer_invitation')) throw error;
  }

  const invitation = await invitationForRevoke(id);
  if (!invitation) return { revoked: false, auth_user_id: null, existing_account: true };
  const rows = await L.sb(`/rest/v1/invitations?id=eq.${encodeURIComponent(id)}&status=eq.sent`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'revoked' })
  });
  return {
    revoked: Array.isArray(rows) && rows.length > 0,
    auth_user_id: invitation.auth_user_id || null,
    existing_account: invitation.existing_account !== false
  };
}


module.exports = async (req, res) => {
  if (L.cors(req, res)) return;
  if (req.headers.origin && !L.allowedOrigin(req.headers.origin)) {
    return L.send(res, 403, { error: 'Account emails can only be requested from the society website.' });
  }
  const missing = L.missingConfig(['SUPABASE_URL', 'SERVICE_KEY']);
  if (missing.length) return L.send(res, 503, { error: `Server not configured: ${missing.join(', ')}` });

  try {
    if (req.method === 'POST') {
      const early = await L.readJson(req, 12 * 1024);
      const earlyAction = String(early.action || '');

      if (earlyAction === 'reset') {
        if (!L.RESEND_KEY) return L.send(res, 503, { error: 'The email service is not configured.' });
        const email = L.cleanText(early.email, 254).toLowerCase();
        if (!L.isEmail(email)) return L.send(res, 400, { error: 'Enter a valid email address.' });

        try {
          if (await maySendAccountEmail(req, email, 'password_reset')) {
            const [profileRows, inviteRows] = await Promise.all([
              L.sb(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,full_name`),
              L.sb(`/rest/v1/invitations?email=eq.${encodeURIComponent(email)}&status=eq.sent&select=id,full_name&order=sent_at.desc&limit=1`)
            ]);
            const known = (Array.isArray(profileRows) ? profileRows[0] : null)
              || (Array.isArray(inviteRows) ? inviteRows[0] : null);
            if (known) {
              const access = await L.generateAccess('recovery', email, RESET_REDIRECT);
              if (!access.link) throw new Error('Supabase did not return a recovery link.');
              const name = known.full_name || email.split('@')[0];
              await L.sendEmail({
                to: email,
                subject: 'Set a new password for the officer portal',
                tag: 'password-reset',
                html: resetEmail(name, access.link)
              });
            }
          }
        } catch (error) {
          // Always return the same public result so the endpoint does not reveal accounts.
          console.error('[members] reset failed', error.message);
        }
        return L.send(res, 200, { ok: true });
      }

      if (earlyAction === 'accept_self') {
        const user = await L.requireUser(req);
        const email = String(user.email || '').trim().toLowerCase();
        if (!email) return L.send(res, 400, { error: 'The signed-in account has no email address.' });
        const accepted = await acceptInvitation(user, email);
        return L.send(res, 200, { ok: true, accepted });
      }

      req.body = early;
    }

    const admin = await L.requireAdmin(req);

    if (req.method === 'GET') {
      const [profiles, invites] = await Promise.all([
        listProfiles(),
        L.sb('/rest/v1/invitations?select=id,email,full_name,status,sent_at,accepted_at,access_level,role_id,error&order=sent_at.desc&limit=150')
      ]);
      return L.send(res, 200, { members: profiles || [], invitations: invites || [] });
    }

    if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed.' });
    const body = await L.readJson(req, 12 * 1024);
    const action = L.cleanText(body.action || 'invite', 24);

    if (action === 'invite' || action === 'resend') {
      if (!L.RESEND_KEY) return L.send(res, 503, { error: 'The email service is not configured.' });
      const email = L.cleanText(body.email, 254).toLowerCase();
      const fullName = L.cleanText(body.full_name, 120);
      const roleId = L.cleanText(body.role_id, 80);
      const note = L.cleanText(body.message, 800);
      if (!L.isEmail(email)) return L.send(res, 400, { error: 'Enter a valid email address.' });
      if (!roleId) return L.send(res, 400, { error: 'Choose a role first.' });

      const roles = await L.sb(`/rest/v1/society_roles?id=eq.${encodeURIComponent(roleId)}&select=id,label,description,access_level,seats,active`);
      const role = Array.isArray(roles) ? roles[0] : null;
      if (!role) return L.send(res, 400, { error: 'That role no longer exists.' });
      if (!role.active) return L.send(res, 400, { error: `${role.label} is not currently active.` });
      if (await seatUsage(role.id, email) >= Number(role.seats || 1)) return L.send(res, 409, { error: `${role.label} has no open seats. Increase the seat count or choose another role.` });
      if (!await maySendAccountEmail(req, email, 'invitation')) return L.send(res, 429, { error: 'Too many recent emails were requested for this address. Try again later.' });

      let access;
      let reused = false;
      try {
        access = await L.generateAccess('invite', email, SETUP_REDIRECT);
      } catch (error) {
        if (!/already|registered|exists/i.test(error.message || '')) throw error;
        access = await L.generateAccess('recovery', email, RESET_REDIRECT);
        reused = true;
      }
      if (!access.link || !access.user?.id) return L.send(res, 502, { error: 'Supabase did not return a complete account setup link.' });

      const name = fullName || access.user.user_metadata?.full_name || email.split('@')[0];
      let resendId = null;
      let failure = null;
      try {
        const sent = await L.sendEmail({
          to: email,
          subject: `Welcome to the society as ${role.label}`,
          tag: reused ? 'invite-existing' : 'invite',
          replyTo: admin.email || undefined,
          html: invitationEmail(name, role.label, role.description, access.link, note, admin && (admin.full_name || admin.email))
        });
        resendId = sent?.id || null;
      } catch (error) {
        failure = error.message || 'Email failed to send.';
      }

      const existing = await L.sb(`/rest/v1/invitations?email=eq.${encodeURIComponent(email)}&status=in.(sent,failed)&select=id&order=sent_at.desc&limit=1`);
      const existingId = Array.isArray(existing) && existing[0] ? existing[0].id : '';
      const inviteRecord = {
        email,
        full_name: fullName,
        role_id: role.id,
        access_level: role.access_level,
        invited_by: admin.id,
        auth_user_id: access.user.id,
        existing_account: reused,
        status: failure ? 'failed' : 'sent',
        message: note,
        resend_id: resendId,
        error: failure,
        sent_at: new Date().toISOString(),
        accepted_at: null
      };
      await saveInvitation(existingId, inviteRecord);

      if (failure) {
        if (!reused) {
          try { await deleteGeneratedUser(access.user.id); }
          catch (cleanupError) { console.error('[members] failed to remove an undelivered invited account', cleanupError.message); }
        }
        return L.send(res, 502, { error: `The invitation email failed: ${failure}` });
      }
      return L.send(res, 200, { ok: true, invited: email, role: role.label, access_level: role.access_level, existingAccount: reused });
    }

    if (action === 'revoke') {
      const id = L.cleanText(body.id, 80);
      if (!id) return L.send(res, 400, { error: 'Choose an invitation to revoke.' });
      const invitation = await revokeInvitation(id);
      if (!invitation.revoked) return L.send(res, 409, { error: 'That invitation is no longer pending.' });
      let cleanupPending = false;
      if (invitation.auth_user_id && !invitation.existing_account) {
        try { await deleteGeneratedUser(invitation.auth_user_id); }
        catch (error) {
          cleanupPending = true;
          console.error('[members] invitation revoked but generated account cleanup failed', error.message);
        }
      }
      return L.send(res, 200, { ok: true, cleanupPending });
    }

    return L.send(res, 400, { error: `Unknown action “${action}”.` });
  } catch (error) {
    console.error('[members]', error);
    return L.send(res, error.status || 500, { error: error.message || 'Unexpected error.' });
  }
};
