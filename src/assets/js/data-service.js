(() => {
  'use strict';

  const config = window.O32_CONFIG || {};
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const staticOnly = new Set(['partner_schools', 'impact', 'documents']);
  const tableFallbacks = {
    site_settings: 'site.json',
    projects: 'projects.json',
    project_updates: 'project_updates.json',
    leaders: 'leaders.json',
    events: 'events.json',
    resources: 'resources.json',
    opportunities: 'opportunities.json',
    news_posts: 'news.json',
    competition_editions: 'competition.json',
    sponsors: 'sponsors.json',
    partner_schools: 'partners.json',
    impact: 'impact.json',
    documents: 'documents.json'
  };

  const sorters = {
    projects: (a, b) => (a.sort_order || 999) - (b.sort_order || 999),
    project_updates: (a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')),
    leaders: (a, b) => (a.sort_order || 999) - (b.sort_order || 999),
    resources: (a, b) => (a.sort_order || 999) - (b.sort_order || 999),
    sponsors: (a, b) => (a.sort_order || 999) - (b.sort_order || 999),
    partner_schools: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
    news_posts: (a, b) => String(b.published_at || '').localeCompare(String(a.published_at || ''))
  };

  function publicHeaders() {
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      Accept: 'application/json'
    };
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
  }

  async function fetchSupabase(table, options = {}) {
    const params = new URLSearchParams();
    params.set('select', options.select || '*');
    if (options.published !== false && table !== 'submissions') params.set('published', 'eq.true');
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, `eq.${value}`);
      });
    }
    const defaultOrder = table === 'competition_editions' ? 'year.desc' : '';
    if (options.order || defaultOrder) params.set('order', options.order || defaultOrder);
    const url = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?${params}`;
    const response = await fetch(url, { headers: publicHeaders() });
    if (!response.ok) throw new Error(`Data request failed for ${table} (${response.status})`);
    return response.json();
  }

  async function get(table, options = {}) {
    try {
      if (hasSupabase && !staticOnly.has(table)) {
        const rows = await fetchSupabase(table, options);
        if (table === 'site_settings') {
          const settings = Array.isArray(rows) ? rows : [];
          if (settings.length && settings[0].settings) return settings[0].settings;
        }
        if (table === 'competition_editions') return Array.isArray(rows) ? (rows[0] || null) : rows;
        return rows;
      }
    } catch (error) {
      console.warn(`[O32] Supabase fallback for ${table}:`, error.message);
    }

    const fallback = tableFallbacks[table];
    if (!fallback) return [];
    const data = await fetchJson(`content/${fallback}`);
    if (Array.isArray(data) && sorters[table]) data.sort(sorters[table]);
    return data;
  }

  function serializeForm(formData) {
    const output = {};
    for (const [key, value] of formData.entries()) {
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = Array.isArray(output[key]) ? [...output[key], value] : [output[key], value];
      } else {
        output[key] = value;
      }
    }
    return output;
  }

  async function submit(type, formData) {
    const payload = serializeForm(formData);
    const record = {
      type,
      full_name: payload.full_name || '',
      email: payload.email || '',
      payload,
      status: 'new'
    };

    if (hasSupabase) {
      const url = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/submissions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...publicHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(record)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Submission failed (${response.status})`);
      }
      return { ok: true, via: 'database' };
    }

    const site = await get('site_settings').catch(() => ({}));
    const email = site.contact_email || config.contactEmail || 'fkusiapp@oberlin.edu';
    const subject = `[Website] ${type.replaceAll('_', ' ')}`;
    const body = Object.entries(payload).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\n\n');
    return {
      ok: true,
      via: 'email',
      mailto: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
  }

  window.O32Data = {
    config,
    hasSupabase,
    get,
    submit,
    serializeForm
  };
})();
