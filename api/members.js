'use strict';

/* Members: list, invite, resend, revoke, and password reset.
 *
 * The invite flow deliberately does not mint its own tokens. Supabase Auth
 * generates a single-use, expiring action link; this endpoint only wraps that
 * link in the society's own email and posts it through Resend. Passwords never
 * touch this code.
 */

const L = require('./_lib.js');

const SETUP_REDIRECT = `${L.ADMIN_ORIGIN}/?welcome=1`;
const RESET_REDIRECT = `${L.ADMIN_ORIGIN}/?reset=1`;

async function template(key, fallbackSubject, fallbackBody) {
  try {
    const rows = await L.sb(`/rest/v1/email_templates?key=eq.${key}&select=subject,body_markdown`);
    if (Array.isArray(rows) && rows[0]) return rows[0];
  } catch { /* fall through to the built-in copy */ }
  return { subject: fallbackSubject, body_markdown: fallbackBody };
}

/* The action link is rendered as a button, so strip the {{action}} marker out
 * of the prose and let wrapEmail() place it. */
function splitAction(md) {
  return String(md).replace(/\n*\{\{action\}\}\n*/g, '\n\n').trim();
}

module.exports = async (req, res) => {
  if (L.cors(req, res)) return;

  const missing = L.missingConfig();
  if (missing.length) return L.send(res, 500, { error: `Server not configured: ${missing.join(', ')}` });

  try {
    const admin = await L.requireAdmin(req);

    /* ---------------------------------------------------------- list ---- */
    if (req.method === 'GET') {
      const profiles = await L.sb('/rest/v1/profiles?select=id,email,full_name,role&order=created_at.asc');
      const invites = await L.sb(
        '/rest/v1/invitations?select=id,email,full_name,status,sent_at,accepted_at,access_level,role_id&order=sent_at.desc&limit=100'
      );
      return L.send(res, 200, { members: profiles || [], invitations: invites || [] });
    }

    if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed.' });

    const body = await L.readJson(req);
    const action = String(body.action || 'invite');

    /* ------------------------------------------------ password reset ---- */
    if (action === 'reset') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!L.isEmail(email)) return L.send(res, 400, { error: 'That email address does not look right.' });

      const link = await L.generateActionLink('recovery', email, RESET_REDIRECT);
      if (!link) return L.send(res, 502, { error: 'Supabase did not return a reset link.' });

      const tpl = await template('password_reset', 'Reset your password', 'Use the button below to choose a new password.');
      const name = String(body.full_name || '').trim() || email.split('@')[0];
      const md = L.fillTemplate(splitAction(tpl.body_markdown), { name, action: '' });

      await L.sendEmail({
        to: email,
        subject: tpl.subject,
        tag: 'password-reset',
        html: L.wrapEmail({
          title: 'Choose a new password',
          bodyHtml: L.markdownToHtml(md),
          actionLabel: 'Set a new password',
          actionUrl: link,
        }),
      });
      return L.send(res, 200, { ok: true, sent: email });
    }

    /* ------------------------------------------------------- invite ---- */
    if (action === 'invite' || action === 'resend') {
      const email = String(body.email || '').trim().toLowerCase();
      const fullName = String(body.full_name || '').trim();
      const roleId = String(body.role_id || '').trim();
      const note = String(body.message || '').trim();

      if (!L.isEmail(email)) return L.send(res, 400, { error: 'That email address does not look right.' });
      if (!roleId) return L.send(res, 400, { error: 'Choose a role. Create one first if the list is empty.' });

      const roles = await L.sb(
        `/rest/v1/society_roles?id=eq.${encodeURIComponent(roleId)}&select=id,label,access_level,seats,active`
      );
      const role = Array.isArray(roles) ? roles[0] : null;
      if (!role) return L.send(res, 400, { error: 'That role no longer exists.' });
      if (!role.active) return L.send(res, 400, { error: `“${role.label}” is not currently active.` });

      /* Supabase creates the user and the single-use link in one step. If the
       * address already has an account, fall back to a recovery link so a
       * resend still gets them in rather than erroring. */
      let link = null;
      let reused = false;
      try {
        link = await L.generateActionLink('invite', email, SETUP_REDIRECT);
      } catch (err) {
        const already = /already|registered|exists/i.test(err.message || '');
        if (!already) throw err;
        link = await L.generateActionLink('recovery', email, RESET_REDIRECT);
        reused = true;
      }
      if (!link) return L.send(res, 502, { error: 'Supabase did not return an invitation link.' });

      /* Give them the access level their role carries. */
      const who = await L.sb(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`);
      const profileId = Array.isArray(who) && who[0] ? who[0].id : null;
      if (profileId) {
        await L.sb(`/rest/v1/profiles?id=eq.${profileId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            role: role.access_level,
            full_name: fullName || undefined,
            updated_at: new Date().toISOString(),
          }),
        });
      }

      const tpl = await template(
        'invitation',
        'You have been added to the Oberlin 3-2 Engineering Society',
        'Hi {{name}},\n\nYou have been added as **{{role}}**.\n\n{{action}}'
      );
      const name = fullName || email.split('@')[0];
      let md = L.fillTemplate(splitAction(tpl.body_markdown), {
        name,
        role: role.label,
        inviter: admin.full_name || admin.email || 'the society',
        action: '',
      });
      if (note) md += `\n\n${note}`;

      let resendId = null;
      let failure = null;
      try {
        const sent = await L.sendEmail({
          to: email,
          subject: L.fillTemplate(tpl.subject, { role: role.label }),
          tag: reused ? 'invite-existing' : 'invite',
          replyTo: admin.email || undefined,
          html: L.wrapEmail({
            title: reused ? 'Your access has been updated' : `You are the society’s ${role.label}`,
            bodyHtml: L.markdownToHtml(md),
            actionLabel: reused ? 'Set a new password' : 'Set your password',
            actionUrl: link,
          }),
        });
        resendId = sent && sent.id;
      } catch (err) {
        failure = err.message || 'Email failed to send.';
      }

      await L.sb('/rest/v1/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email,
          full_name: fullName,
          role_id: role.id,
          access_level: role.access_level,
          invited_by: admin.id,
          status: failure ? 'failed' : 'sent',
          message: note,
          resend_id: resendId,
          error: failure,
        }),
      });

      if (failure) return L.send(res, 502, { error: `Account ready, but the email failed: ${failure}` });
      return L.send(res, 200, {
        ok: true,
        invited: email,
        role: role.label,
        access_level: role.access_level,
        existingAccount: reused,
      });
    }

    /* ------------------------------------------------------- revoke ---- */
    if (action === 'revoke') {
      const id = String(body.id || '');
      if (!id) return L.send(res, 400, { error: 'Which invitation?' });
      await L.sb(`/rest/v1/invitations?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'revoked' }),
      });
      return L.send(res, 200, { ok: true });
    }

    return L.send(res, 400, { error: `Unknown action “${action}”.` });
  } catch (err) {
    return L.send(res, err.status || 500, { error: err.message || 'Unexpected error.' });
  }
};
