import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const fromRoot = (...parts: string[]): string => join(rootPath, ...parts);
const publicDir = fromRoot('public');
const domain = 'https://www.oberlin32engineeringsociety.com';

interface SiteSettings {
  content_version?: string;
}

interface FeedRecord {
  title?: string;
  excerpt?: string;
  summary?: string;
  body?: string;
  published?: boolean;
  published_at?: string;
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function write(relativePath: string, value: string): Promise<void> {
  const target = fromRoot('public', relativePath);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, value, 'utf8');
}

async function prepareAssets(): Promise<void> {
  await rm(publicDir, { recursive: true, force: true });
  await mkdir(fromRoot('public', 'assets'), { recursive: true });
  await cp(fromRoot('src', 'assets', 'images'), fromRoot('public', 'assets', 'images'), { recursive: true });
  await cp(fromRoot('src', 'assets', 'downloads'), fromRoot('public', 'assets', 'downloads'), { recursive: true });
  await cp(fromRoot('content'), fromRoot('public', 'content'), { recursive: true });
}

/* Bake the current database into the bundled fallback at build time.
 *
 * The public pages read Supabase directly, so they are live already. The
 * bundled JSON is what a visitor gets when that request cannot be made -- an
 * extension blocking the domain, a network that drops it, an outage. Those
 * files are committed, so without this they show whatever was true at the last
 * commit: a roster missing an officer, portraits that were uploaded weeks ago
 * still absent.
 *
 * Pulling them fresh on every deploy means the offline copy is never older
 * than the last release. It uses the anon key, which is public by design and
 * already shipped in the runtime config, and reads only published rows. A
 * failure here is not fatal: the committed files remain, and the build says so
 * rather than shipping something half-written.
 */
async function refreshBundledContent(): Promise<void> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!base || !key) {
    console.warn('[prepare] no Supabase credentials; keeping the committed fallback content');
    return;
  }
  // Only tables the database fully owns. partner_schools is excluded on
  // purpose: it has no reviewed_at column, so syncing it would strip the
  // "checked on" dates the cards show and the release rules require.
  const tables: Record<string, string> = {
    leaders: 'leaders.json',
    projects: 'projects.json',
    project_updates: 'project_updates.json',
    events: 'events.json',
    news_posts: 'news.json',
    sponsors: 'sponsors.json',
  };
  const drop = new Set(['created_at', 'updated_at', 'auth_user_id', 'uploaded_by', 'invited_by']);
  for (const [table, filename] of Object.entries(tables)) {
    try {
      const response = await fetch(`${base}/rest/v1/${table}?select=*&published=eq.true`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = (await response.json()) as Record<string, unknown>[];
      if (!Array.isArray(rows)) throw new Error('unexpected payload');
      const cleaned = rows.map((row) =>
        Object.fromEntries(Object.entries(row).filter(([column]) => !drop.has(column))),
      );
      cleaned.sort((a, b) => {
        const left = typeof a.sort_order === 'number' ? a.sort_order : 999;
        const right = typeof b.sort_order === 'number' ? b.sort_order : 999;
        if (left !== right) return left - right;
        return String(a.title ?? a.name ?? a.id ?? '').localeCompare(String(b.title ?? b.name ?? b.id ?? ''));
      });
      await writeFile(fromRoot('public', 'content', filename), `${JSON.stringify(cleaned, null, 2)}\n`, 'utf8');
      console.log(`[prepare] ${table}: ${cleaned.length} row(s) baked into the fallback`);
    } catch (error) {
      console.warn(`[prepare] ${table}: keeping the committed fallback (${(error as Error).message})`);
    }
  }
}

async function writeRuntimeConfig(site: SiteSettings): Promise<void> {
  const portalEnabled = process.env.NEXT_PUBLIC_ENABLE_PORTAL?.trim().toLowerCase() === 'true';
  const useDatabase = portalEnabled && process.env.NEXT_PUBLIC_USE_DATABASE?.trim().toLowerCase() === 'true';
  const config = {
    supabaseUrl: portalEnabled ? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '' : '',
    supabaseAnonKey: portalEnabled
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? ''
      : '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'society-media',
    portalEnabled,
    useDatabase,
    contentVersion: site.content_version ?? '',
  };
  await write('assets/js/runtime-config.js', `window.O32_CONFIG=${JSON.stringify(config)};\n`);
}

async function writeFeed(): Promise<void> {
  const news = await readJson<FeedRecord[]>(fromRoot('content', 'news.json'));
  const updates = await readJson<FeedRecord[]>(fromRoot('content', 'project_updates.json'));
  const records = [
    ...news.filter((item) => item.published !== false).map((item) => ({ ...item, description: item.excerpt, url: `${domain}/events#news` })),
    ...updates.filter((item) => item.published !== false).map((item) => ({ ...item, description: item.summary, url: `${domain}/projects#updates` })),
  ].sort((a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? ''))).slice(0, 30);

  const items = records.map((record) => {
    const parsed = record.published_at ? new Date(record.published_at) : new Date();
    const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const title = record.title ?? 'Society update';
    const guid = `${record.url}#${slug(title)}`;
    return `<item><title>${escapeXml(title)}</title><link>${escapeXml(record.url)}</link><guid>${escapeXml(guid)}</guid><pubDate>${date.toUTCString()}</pubDate><description>${escapeXml(record.description)}</description><content:encoded><![CDATA[<p>${escapeXml(record.body)}</p>]]></content:encoded></item>`;
  }).join('');

  await write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Oberlin 3-2 Engineering Society</title><link>${domain}</link><description>Confirmed news and project updates from the society.</description>${items}</channel></rss>\n`);
}

async function writeStaticFiles(site: SiteSettings): Promise<void> {
  const manifest = {
    name: 'Oberlin 3-2 Engineering Society',
    short_name: 'Oberlin 3-2',
    description: 'A student group for engineering projects and 3-2 planning at Oberlin College.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#161317',
    theme_color: '#161317',
    icons: [
      { src: 'assets/images/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/images/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/images/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await write('site.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`);
  await write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${domain}/sitemap.xml\n`);
  await write('CNAME', 'oberlin32engineeringsociety.com\n');
  await write('.nojekyll', '');
  await write('humans.txt', 'Oberlin 3-2 Engineering Society\nStudent-led. Founding stage, 2026–27.\n');
  await write('.well-known/security.txt', `Contact: mailto:fkusiapp@oberlin.edu\nPreferred-Languages: en\nCanonical: ${domain}/.well-known/security.txt\n`);

  const revision = createHash('sha256').update(JSON.stringify(site)).digest('hex').slice(0, 12);
  await write('service-worker.js', `const CACHE='o32-${revision}';\nself.addEventListener('install',(event)=>event.waitUntil(self.skipWaiting()));\nself.addEventListener('activate',(event)=>event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',(event)=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;event.respondWith(fetch(event.request).then((response)=>{if(response.ok)caches.open(CACHE).then((cache)=>cache.put(event.request,response.clone()));return response;}).catch(()=>caches.match(event.request).then((cached)=>cached||Response.error())));});\n`);
}

async function main(): Promise<void> {
  await prepareAssets();
  // After the copy, so the fresh rows overwrite the committed ones.
  await refreshBundledContent();
  const site = await readJson<SiteSettings>(fromRoot('content', 'site.json'));
  await Promise.all([writeRuntimeConfig(site), writeFeed(), writeStaticFiles(site)]);
  console.log('Prepared Astro public assets and runtime configuration.');
}

void main().catch((error: unknown) => {
  console.error('Could not prepare public assets.', error);
  process.exitCode = 1;
});
