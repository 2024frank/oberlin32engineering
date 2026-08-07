'use strict';

const L = require('./_lib.js');

function slugify(value) {
  return L.cleanText(value, 80).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function integer(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function boolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const missing = L.missingConfig(['SUPABASE_URL', 'SERVICE_KEY', 'ANON_KEY']);
  if (missing.length) return L.send(res, 503, { error: `Server not configured: ${missing.join(', ')}` });

  try {
    await L.requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await L.sb('/rest/v1/society_roles?select=id,slug,label,description,access_level,seats,sort_order,active,created_at,updated_at&order=sort_order.asc,label.asc');
      return L.send(res, 200, { roles: rows || [] });
    }

    if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE, OPTIONS');
      return L.send(res, 405, { error: 'Method not allowed.' });
    }

    const body = await L.readJson(req, 10 * 1024);

    if (req.method === 'POST') {
      const label = L.cleanText(body.label, 100);
      const description = L.cleanText(body.description, 600);
      const slug = slugify(body.slug || label);
      if (!label) return L.send(res, 400, { error: 'Enter a role name.' });
      if (!slug) return L.send(res, 400, { error: 'The role name needs at least one letter or number.' });

      const row = {
        slug,
        label,
        description,
        access_level: body.access_level === 'admin' ? 'admin' : 'editor',
        seats: integer(body.seats, 1, 1, 50),
        sort_order: integer(body.sort_order, 100, 0, 10000),
        active: boolean(body.active, true)
      };

      const created = await L.sb('/rest/v1/society_roles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row)
      });
      return L.send(res, 201, { role: Array.isArray(created) ? created[0] : created });
    }

    const id = L.cleanText(body.id, 80);
    if (!id) return L.send(res, 400, { error: 'Choose a role first.' });

    if (req.method === 'DELETE') {
      await L.sb(`/rest/v1/society_roles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ active: false, updated_at: new Date().toISOString() })
      });
      return L.send(res, 200, { ok: true, deactivated: id });
    }

    const patch = {};
    if (Object.prototype.hasOwnProperty.call(body, 'label')) {
      patch.label = L.cleanText(body.label, 100);
      if (!patch.label) return L.send(res, 400, { error: 'The role name cannot be empty.' });
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) patch.description = L.cleanText(body.description, 600);
    if (Object.prototype.hasOwnProperty.call(body, 'access_level')) patch.access_level = body.access_level === 'admin' ? 'admin' : 'editor';
    if (Object.prototype.hasOwnProperty.call(body, 'seats')) patch.seats = integer(body.seats, 1, 1, 50);
    if (Object.prototype.hasOwnProperty.call(body, 'sort_order')) patch.sort_order = integer(body.sort_order, 100, 0, 10000);
    if (Object.prototype.hasOwnProperty.call(body, 'active')) patch.active = boolean(body.active);
    if (Object.prototype.hasOwnProperty.call(body, 'slug')) {
      patch.slug = slugify(body.slug);
      if (!patch.slug) return L.send(res, 400, { error: 'The role identifier cannot be empty.' });
    }
    if (!Object.keys(patch).length) return L.send(res, 400, { error: 'No valid role changes were provided.' });
    patch.updated_at = new Date().toISOString();

    const updated = await L.sb(`/rest/v1/society_roles?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch)
    });
    const role = Array.isArray(updated) ? updated[0] : updated;
    if (!role) return L.send(res, 404, { error: 'That role no longer exists.' });
    return L.send(res, 200, { role });
  } catch (error) {
    console.error('[roles]', error);
    const duplicate = /duplicate key|already exists|23505/i.test(`${error.message} ${JSON.stringify(error.detail || '')}`);
    if (duplicate) return L.send(res, 409, { error: 'A role with that name or identifier already exists.' });
    return L.send(res, error.status || 500, { error: error.message || 'Unexpected error.' });
  }
};
