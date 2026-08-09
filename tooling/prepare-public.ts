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
  const site = await readJson<SiteSettings>(fromRoot('content', 'site.json'));
  await Promise.all([writeRuntimeConfig(site), writeFeed(), writeStaticFiles(site)]);
  console.log('Prepared Astro public assets and runtime configuration.');
}

void main().catch((error: unknown) => {
  console.error('Could not prepare public assets.', error);
  process.exitCode = 1;
});
