import { isRecord, type RuntimeConfig, type UnknownRecord } from './types';

const defaults: RuntimeConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  storageBucket: 'society-media',
  portalEnabled: false,
  useDatabase: false,
  contentVersion: '',
};

export const config: RuntimeConfig = { ...defaults, ...window.O32_CONFIG };
export const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
export const useDatabase = hasSupabase && config.useDatabase;

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
  documents: 'documents.json',
} as const;

export type PublicTable = keyof typeof tableFallbacks;

export interface QueryOptions {
  select?: string;
  published?: boolean;
  filters?: Record<string, string | number | boolean | null | undefined>;
  order?: string;
}

const sorters: Partial<Record<PublicTable, (a: UnknownRecord, b: UnknownRecord) => number>> = {
  projects: (a, b) => Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999),
  project_updates: (a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')),
  leaders: (a, b) => Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999),
  events: (a, b) => String(a.start_at ?? '9999').localeCompare(String(b.start_at ?? '9999')),
  resources: (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999),
  opportunities: (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || String(a.deadline ?? '9999').localeCompare(String(b.deadline ?? '9999')),
  news_posts: (a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')),
  partner_schools: (a, b) => Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999),
};

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json() as Promise<unknown>;
}

async function fetchSupabase(table: PublicTable, options: QueryOptions): Promise<unknown> {
  const params = new URLSearchParams({ select: options.select ?? '*' });
  if (options.published !== false && table !== 'site_settings') params.set('published', 'eq.true');
  if (table === 'site_settings') params.set('published', 'eq.true');
  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, `eq.${String(value)}`);
  }
  if (options.order) params.set('order', options.order);
  const base = config.supabaseUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/rest/v1/${table}?${params}`, {
    cache: 'no-store',
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Data request failed for ${table} (${response.status})`);
  return response.json() as Promise<unknown>;
}

function normalize(table: PublicTable, value: unknown, options: QueryOptions): unknown {
  if (table === 'site_settings') {
    const record = Array.isArray(value) ? value[0] : value;
    return isRecord(record) && isRecord(record.settings) ? record.settings : {};
  }
  if (table === 'competition_editions') {
    const rows = (Array.isArray(value) ? value.filter(isRecord) : isRecord(value) ? [value] : [])
      .filter((row) => options.published === false || row.published !== false);
    return rows.sort((a, b) => String(b.year ?? '').localeCompare(String(a.year ?? '')))[0] ?? null;
  }
  if (!Array.isArray(value)) return value;
  const rows = value.filter(isRecord).filter((row) => options.published === false || row.published !== false);
  return sorters[table] ? rows.sort(sorters[table]) : rows;
}

export async function get(table: PublicTable, options: QueryOptions = {}): Promise<unknown> {
  if (useDatabase) {
    /* Try twice before giving up on the live data.
     *
     * Falling back is a real downgrade: the bundled copy is only as fresh as
     * the last deploy, so a single dropped request left a visitor reading a
     * roster that could be weeks out of date, with nothing on screen to say
     * so. One quick retry covers the common causes -- a flaky connection, a
     * cold start, a request cancelled during navigation -- without making a
     * genuine outage noticeably slower. */
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return normalize(table, await fetchSupabase(table, options), options);
      } catch (error) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          continue;
        }
        console.warn(`[O32] Database unavailable for ${table} after 2 attempts; using bundled content, which is only current as of the last deploy.`, error);
      }
    }
  }
  return normalize(table, await fetchJson(`/content/${tableFallbacks[table]}`), options);
}

export function serializeForm(formData: FormData): Record<string, string | string[]> {
  const output: Record<string, string | string[]> = {};
  for (const [key, raw] of formData.entries()) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    const current = output[key];
    output[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  }
  return output;
}

export async function submit(type: string, formData: FormData): Promise<UnknownRecord> {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ type, ...serializeForm(formData) }),
  });
  const value: unknown = await response.json().catch(() => ({}));
  const data = isRecord(value) ? value : {};
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Your message could not be sent. Please try again.');
  return data;
}
