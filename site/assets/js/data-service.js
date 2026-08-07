(() => {
  'use strict';

  const config = window.O32_CONFIG || {};
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const useDatabase = hasSupabase && config.useDatabase === true;
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
    projects: (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
    project_updates: (a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')),
    leaders: (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
    events: (a, b) => String(a.start_at || '9999').localeCompare(String(b.start_at || '9999')),
    resources: (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (a.sort_order ?? 999) - (b.sort_order ?? 999),
    opportunities: (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')),
    news_posts: (a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')),
    partner_schools: (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
  };

  function publicHeaders() {
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      Accept: 'application/json'
    };
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
  }

  async function fetchSupabase(table, options = {}) {
    const params = new URLSearchParams({ select: options.select || '*' });
    if (options.published !== false && table !== 'submissions' && table !== 'site_settings') {
      params.set('published', 'eq.true');
    }
    if (table === 'site_settings') params.set('published', 'eq.true');
    Object.entries(options.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, `eq.${value}`);
    });
    if (options.order) params.set('order', options.order);
    const base = String(config.supabaseUrl).replace(/\/$/, '');
    const response = await fetch(`${base}/rest/v1/${table}?${params}`, {
      headers: publicHeaders(),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Data request failed for ${table} (${response.status})`);
    return response.json();
  }

  async function get(table, options = {}) {
    if (!tableFallbacks[table]) return [];
    if (useDatabase) {
      try {
        const rows = await fetchSupabase(table, options);
        if (table === 'site_settings') {
          const record = Array.isArray(rows) ? rows[0] : rows;
          if (record?.settings) return record.settings;
        } else if (table === 'competition_editions') {
          const records = Array.isArray(rows) ? rows : [];
          if (records.length) return records.sort((a, b) => String(b.year || '').localeCompare(String(a.year || '')))[0];
        } else if (Array.isArray(rows) && rows.length) {
          return sorters[table] ? rows.sort(sorters[table]) : rows;
        } else if (rows && !Array.isArray(rows)) {
          return rows;
        }
      } catch (error) {
        console.warn(`[O32] Using versioned fallback for ${table}:`, error.message);
      }
    }

    const data = await fetchJson(`content/${tableFallbacks[table]}`);
    if (Array.isArray(data) && sorters[table]) data.sort(sorters[table]);
    return data;
  }

  function serializeForm(formData) {
    const output = {};
    for (const [key, raw] of formData.entries()) {
      const value = typeof raw === 'string' ? raw.trim() : raw;
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
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ type, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Your message could not be sent. Please try again.');
    return data;
  }

  window.O32Data = { config, hasSupabase, useDatabase, get, submit, serializeForm };
})();
