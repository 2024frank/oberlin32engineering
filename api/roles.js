'use strict';

/* Assignable leadership roles.
 *
 * The add-member picker reads only from this table, which is the point: a role
 * has to exist before anyone can be invited into it, so the admin controls the
 * vocabulary rather than typing free text each time.
 */

const L = require('./_lib.js');

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

module.exports = async (req, res) => {
  if (L.cors(req, res)) return;

  const missing = L.missingConfig();
  if (missing.length) return L.send(res, 500, { error: `Server not configured: ${missing.join(', ')}` });

  try {
    await L.requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await L.sb(
        '/rest/v1/society_roles?select=id,slug,label,description,access_level,seats,sort_order,active&order=sort_order.asc'
      );
      return L.send(res, 200, { roles: rows || [] });
    }

    if (req.method === 'POST') {
      const body = await L.readJson(req);
      const label = String(body.label || '').trim();
      if (!label) return L.send(res, 400, { error: 'A role name is required.' });

      const access = body.access_level === 'admin' ? 'admin' : 'editor';
      const row = {
        slug: slugify(body.slug || label),
        label,
        description: String(body.description || '').trim(),
        access_level: access,
        seats: Number.isFinite(+body.seats) && +body.seats > 0 ? Math.min(+body.seats, 50) : 1,
        sort_order: Number.isFinite(+body.sort_order) ? +body.sort_order : 100,
      };
      if (!row.slug) return L.send(res, 400, { error: 'That role name cannot be turned into an identifier.' });

      const created = await L.sb('/rest/v1/society_roles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      return L.send(res, 201, { role: Array.isArray(created) ? created[0] : created });
    }

    if (req.method === 'PATCH') {
      const body = await L.readJson(req);
      const id = String(body.id || '');
      if (!id) return L.send(res, 400, { error: 'Which role?' });

      const patch = {};
      ['label', 'description', 'sort_order', 'active', 'seats'].forEach((k) => {
        if (k in body) patch[k] = body[k];
      });
      if ('access_level' in body) patch.access_level = body.access_level === 'admin' ? 'admin' : 'editor';
      patch.updated_at = new Date().toISOString();

      const updated = await L.sb(`/rest/v1/society_roles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      return L.send(res, 200, { role: Array.isArray(updated) ? updated[0] : updated });
    }

    if (req.method === 'DELETE') {
      const body = await L.readJson(req);
      const id = String(body.id || '');
      if (!id) return L.send(res, 400, { error: 'Which role?' });

      /* Deactivate rather than delete: invitations reference the role, and the
       * leadership archive should still be able to explain who held what. */
      await L.sb(`/rest/v1/society_roles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
      });
      return L.send(res, 200, { ok: true, deactivated: id });
    }

    return L.send(res, 405, { error: 'Method not allowed.' });
  } catch (err) {
    return L.send(res, err.status || 500, { error: err.message || 'Unexpected error.' });
  }
};
