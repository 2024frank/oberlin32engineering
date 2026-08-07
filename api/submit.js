'use strict';

const L = require('./_lib');

const RULES = {
  membership_interest: {
    fields: ['full_name','email','class_year','academic_interest','interests','experience','availability','motivation','access_needs','consent','started_at','company'],
    required: ['full_name','email','consent'],
    message: 'Thanks. You are on the launch-interest list.'
  },
  project_idea: {
    fields: ['full_name','email','problem','first_test','skills_needed','experience','started_at','company'],
    required: ['full_name','email','problem','first_test'],
    message: 'Thanks. Your project idea has been received for review.'
  },
  event_interest: {
    fields: ['full_name','email','events','best_days','best_times','started_at','company'],
    required: ['full_name','email'],
    message: 'Thanks. Your event preferences have been recorded.'
  },
  showcase_interest: {
    fields: ['full_name','email','preferred_format','message','started_at','company'],
    required: ['full_name','email','message'],
    message: 'Thanks. Your showcase feedback has been received.'
  },
  contact: {
    fields: ['full_name','email','topic','message','started_at','company'],
    required: ['full_name','email','message'],
    message: 'Thanks. Your message has been sent to the organizing team.'
  }
};

function cleanValue(value, max = 2500) {
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => L.cleanText(item, 180)).filter(Boolean);
  return L.cleanText(value, max);
}

function cleanPayload(body, rule) {
  const payload = {};
  for (const field of rule.fields) {
    if (field === 'company' || field === 'started_at') continue;
    if (Object.prototype.hasOwnProperty.call(body, field)) payload[field] = cleanValue(body[field], field === 'message' || field === 'motivation' || field === 'access_needs' || field === 'problem' || field === 'first_test' ? 2500 : 400);
  }
  return payload;
}


function missingSubmissionRpc(error) {
  const detail = `${error?.message || ''} ${JSON.stringify(error?.detail || '')}`;
  return /accept_public_submission|PGRST202|schema cache|function[^.]*not found/i.test(detail);
}

async function saveWithLegacySchema({ type, fullName, email, payload, sourcePath, userAgent }) {
  const since = encodeURIComponent(new Date(Date.now() - 30 * 60 * 1000).toISOString());
  const recent = await L.sb(`/rest/v1/submissions?email=eq.${encodeURIComponent(email)}&created_at=gte.${since}&select=id&limit=5`);
  if (Array.isArray(recent) && recent.length >= 5) throw L.httpError(429, 'Too many recent submissions. Please try again later.');

  const rows = await L.sb('/rest/v1/submissions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      type,
      full_name: fullName,
      email,
      payload: {
        ...payload,
        _meta: { source: sourcePath || 'website', user_agent: userAgent, compatibility_mode: true }
      },
      status: 'new'
    })
  });
  return Array.isArray(rows) ? rows[0]?.id : rows?.id;
}

function notificationHtml(type, payload) {
  const rows = Object.entries(payload).map(([key, value]) => {
    const display = Array.isArray(value) ? value.join(', ') : value;
    return `<tr><th style="padding:7px 12px 7px 0;text-align:left;vertical-align:top;color:#555b65">${L.escapeHtml(key.replaceAll('_', ' '))}</th><td style="padding:7px 0;white-space:pre-wrap">${L.escapeHtml(display)}</td></tr>`;
  }).join('');
  return L.wrapEmail({ bodyHtml: `<p>A new <strong>${L.escapeHtml(type.replaceAll('_', ' '))}</strong> submission was received.</p><table style="border-collapse:collapse;width:100%">${rows}</table>` });
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed.' });
  if (req.headers.origin && !L.allowedOrigin(req.headers.origin)) return L.send(res, 403, { error: 'This form can only be submitted from the society website.' });

  const missing = L.missingConfig(['SUPABASE_URL', 'SERVICE_KEY']);
  if (missing.length) return L.send(res, 503, { error: 'The form service is not configured yet.' });

  try {
    const body = await L.readJson(req, 16 * 1024);
    const type = L.cleanText(body.type, 60);
    const rule = RULES[type];
    if (!rule) return L.send(res, 400, { error: 'Unknown form type.' });

    // Bots commonly fill fields hidden from people. Return success without storing it.
    if (L.cleanText(body.company, 200)) return L.send(res, 200, { ok: true, message: rule.message });

    const startedAt = Number(body.started_at || 0);
    const elapsed = Date.now() - startedAt;
    if (!Number.isFinite(startedAt) || startedAt <= 0 || elapsed < 1200 || elapsed > 24 * 60 * 60 * 1000) {
      return L.send(res, 400, { error: 'Please reload the page and try the form again.' });
    }

    const payload = cleanPayload(body, rule);
    const fullName = L.cleanText(payload.full_name, 120);
    const email = L.cleanText(payload.email, 254).toLowerCase();
    if (!L.isEmail(email)) return L.send(res, 400, { error: 'Enter a valid email address.' });
    if (type === 'membership_interest' && !email.endsWith('@oberlin.edu')) return L.send(res, 400, { error: 'Use your @oberlin.edu email address for membership.' });
    if (rule.required.some((field) => !payload[field] || (Array.isArray(payload[field]) && !payload[field].length))) return L.send(res, 400, { error: 'Complete the required fields.' });
    if (type === 'membership_interest' && payload.consent !== 'yes') return L.send(res, 400, { error: 'Consent is required so we may contact you.' });

    const salt = process.env.SUBMISSION_SALT || L.SERVICE_KEY;
    const ipHash = L.sha256(`${salt}:${L.clientIp(req)}`);
    const userAgent = L.cleanText(req.headers['user-agent'] || '', 300);
    const sourcePath = L.cleanText(req.headers.referer || '', 500);

    let result;
    try {
      result = await L.sb('/rest/v1/rpc/accept_public_submission', {
        method: 'POST',
        body: JSON.stringify({
          p_type: type,
          p_full_name: fullName,
          p_email: email,
          p_payload: payload,
          p_ip_hash: ipHash,
          p_user_agent: userAgent,
          p_source: sourcePath || 'website'
        })
      });
    } catch (error) {
      const diagnostic = `${error.message} ${JSON.stringify(error.detail || '')}`;
      if (/rate[_ -]?limit/i.test(diagnostic) || error.status === 429) return L.send(res, 429, { error: 'Too many recent submissions. Please try again later.' });
      if (!missingSubmissionRpc(error)) throw error;
      result = await saveWithLegacySchema({ type, fullName, email, payload, sourcePath, userAgent });
    }

    // Only the membership form asks for consent to be contacted, so it is the
    // only one that puts a person on the mailing list. An address that is
    // already there keeps its existing unsubscribe state.
    if (type === 'membership_interest' && payload.consent === 'yes') {
      try {
        await L.sb('/rest/v1/subscribers', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify({
            email,
            full_name: fullName,
            source: 'membership form',
            confirmed: true,
            confirmed_at: new Date().toISOString(),
          }),
        });
      } catch (error) {
        // The submission itself is saved; failing to list them is not a reason
        // to tell the student their form did not go through.
        console.error('[submit] subscriber upsert failed', error.message);
      }
    }

    if (L.RESEND_KEY) {
      try {
        await L.sendEmail({
          to: L.CONTACT,
          subject: `[Oberlin 3-2] ${type.replaceAll('_', ' ')}`,
          html: notificationHtml(type, payload),
          replyTo: email,
          tag: 'public-form'
        });
      } catch (error) {
        console.error('[submit] notification email failed', error.message);
      }
    }

    return L.send(res, 201, { ok: true, id: Array.isArray(result) ? result[0] : result, message: rule.message });
  } catch (error) {
    console.error('[submit]', error);
    return L.send(res, error.status || 500, { error: error.status && error.status < 500 ? error.message : 'Your submission could not be saved. Please try again.' });
  }
};
