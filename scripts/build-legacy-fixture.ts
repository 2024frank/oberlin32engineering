// Converts the legacy static-site repo (2024frank/oberlinengineeringclub) into the
// dataset shape `migrate-legacy.ts` consumes, so the legacy content can be imported
// with the same mappers, provenance rules, and safety report as a live-database import.
//
//   node --experimental-strip-types scripts/build-legacy-fixture.ts --source ../oberlinengineeringclub
//
// Writes artifacts/migration/legacy-fixture.json plus a notes file listing everything
// intentionally left out for human review.
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Legacy JSON is untyped by nature; matches the `Row` convention in migrate-legacy.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const args = process.argv.slice(2)
function arg(name: string, fallback: string): string {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const source = path.resolve(arg('source', '../oberlinengineeringclub'))
const baseUrl = arg('base-url', 'https://www.oberlin32engineeringsociety.com').replace(/\/$/, '')
const outFile = path.resolve(arg('out', 'artifacts/migration/legacy-fixture.json'))
const notesFile = outFile.replace(/\.json$/, '-notes.json')

const contentDir = path.join(source, 'content')
const siteDir = path.join(source, 'site')

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(contentDir, file), 'utf8')) as T
}

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' }

// The legacy repo records provenance in photo_credits.json; map it onto the values the
// media provenance constraints in 018_media_provenance.sql expect.
function sourceTypeFor(license: string): 'original' | 'licensed' | 'generated' {
  const value = license.toLowerCase()
  if (value.includes('generated')) return 'generated'
  if (value.includes('license') || value.includes('creative commons')) return 'licensed'
  return 'original'
}

function mediaIdForPhoto(file: string): string {
  return `photo-${path.basename(file).replace(/\.[^.]+$/, '')}`
}

const notes: Row = { generatedFrom: source, baseUrl, excluded: {}, reviewRequired: {} }

async function buildMedia(credits: Row[], leaders: Row[]): Promise<Row[]> {
  const media: Row[] = []

  for (const credit of credits) {
    const relative = String(credit.file).replace(/^\/+/, '')
    const absolute = path.join(siteDir, relative)
    const extension = path.extname(relative).toLowerCase()
    const row: Row = {
      id: mediaIdForPhoto(relative),
      file_name: path.basename(relative),
      storage_path: `legacy/${path.basename(relative)}`,
      public_url: `${baseUrl}/${relative}`,
      mime_type: MIME[extension] ?? 'application/octet-stream',
      alt_text: String(credit.description ?? '').trim() || path.basename(relative),
      caption: '',
      tags: ['legacy'],
      source_type: sourceTypeFor(String(credit.license ?? '')),
      rights_note: [credit.license, credit.photographer, credit.source].map(value => String(value ?? '').trim()).filter(Boolean).join(' · '),
      protected: false
    }

    try {
      const info = await stat(absolute)
      row.size_bytes = info.size
      row.content_hash = createHash('sha256').update(await readFile(absolute)).digest('hex')
      if (extension !== '.svg') {
        const meta = await sharp(absolute).metadata()
        row.width = meta.width ?? null
        row.height = meta.height ?? null
      }
    } catch {
      // A credited file missing from the checkout is still importable: migrate-legacy
      // re-fetches bytes from public_url and recomputes the size.
      (notes.reviewRequired.mediaMissingLocally ??= []).push(relative)
    }

    media.push(row)
  }

  for (const leader of leaders) {
    const url = String(leader.photo_url ?? '').trim()
    if (!url) continue
    const fileName = path.basename(new URL(url).pathname)
    media.push({
      id: `leader-photo-${leader.id}`,
      file_name: fileName,
      storage_path: `legacy/${fileName}`,
      public_url: url,
      mime_type: MIME[path.extname(fileName).toLowerCase()] ?? 'image/jpeg',
      alt_text: `${leader.name}, ${leader.role}`,
      caption: '',
      tags: ['legacy', 'leader'],
      source_type: 'original',
      rights_note: 'Officer portrait migrated from the legacy OEC site',
      protected: false
    })
  }

  return media
}

const [site, credits, leaders, events, news, resources, opportunities, partners, documents, impact, competition, projects, projectUpdates, sponsors] = await Promise.all([
  readJson<Row>('site.json'),
  readJson<Row[]>('photo_credits.json'),
  readJson<Row[]>('leaders.json'),
  readJson<Row[]>('events.json'),
  readJson<Row[]>('news.json'),
  readJson<Row[]>('resources.json'),
  readJson<Row[]>('opportunities.json'),
  readJson<Row[]>('partners.json'),
  readJson<Row[]>('documents.json'),
  readJson<Row>('impact.json'),
  readJson<Row>('competition.json'),
  readJson<Row[]>('projects.json'),
  readJson<Row[]>('project_updates.json'),
  readJson<Row[]>('sponsors.json')
])

const media = await buildMedia(credits, leaders)
const coverIdFor = (value: unknown): string => {
  const relative = String(value ?? '').trim()
  return relative ? mediaIdForPhoto(relative) : ''
}

const dataset: Record<string, Row[]> = {
  media,
  projects,
  project_updates: projectUpdates,
  sponsors,
  leaders: leaders.map(leader => ({ ...leader, photo_media_id: leader.photo_url ? `leader-photo-${leader.id}` : '' })),
  events: events.map(event => ({ ...event, cover_media_id: coverIdFor(event.cover_url) })),
  news_posts: news.map(post => ({ ...post, cover_media_id: coverIdFor(post.cover_url) })),
  resources,
  opportunities,
  // The legacy field is `url`; the new partner_schools column is `official_url`.
  partner_schools: partners.map(partner => ({ ...partner, official_url: partner.official_url ?? partner.url })),
  documents,
  submissions: [],
  profiles: [],
  // Review-only surfaces: recorded in the migration report, never written to content tables.
  competition_editions: [{ ...competition, id: competition.id ?? `competition-${competition.year ?? 'unknown'}` }],
  impact: [{ ...impact, id: 'impact' }],
  // Only keys the migration allowlists. `contact` and `footer` are deliberately omitted:
  // the legacy contact_email is empty (an empty string fails the site-settings schema) and
  // the legacy footer/tagline carries the old "Oberlin 3-2 Engineering Society" identity.
  site_settings: [
    { key: 'social', value: { instagram: String(site.instagram_url ?? ''), linkedin: '', github: '' } },
    { key: 'announcement', value: { enabled: Boolean(site.announcement), text: String(site.announcement ?? ''), href: String(site.announcement_link ?? '') } }
  ]
}

notes.excluded.siteIdentity = {
  reason: 'The legacy site is branded "Oberlin 3-2 Engineering Society"; the rebuild is "Oberlin Engineering Club". Importing these would rebrand the new site backwards.',
  fields: { name: site.name, short_name: site.short_name, tagline: site.tagline, hero_title: site.hero_title, hero_description: site.hero_description, footer: site.tagline }
}
notes.excluded.contactEmail = { reason: 'Legacy contact_email is empty, and an empty string fails siteSettingsSchema. The reviewed default engineering@oberlin.edu stays in place.', value: site.contact_email }
notes.reviewRequired.generatedMedia = media.filter(row => row.source_type === 'generated').map(row => row.file_name)
notes.reviewRequired.impactMilestones = (impact.milestones ?? []).length
notes.reviewRequired.competition = competition.title
notes.counts = Object.fromEntries(Object.entries(dataset).map(([table, rows]) => [table, rows.length]))

await mkdir(path.dirname(outFile), { recursive: true })
await writeFile(outFile, JSON.stringify(dataset, null, 2))
await writeFile(notesFile, JSON.stringify(notes, null, 2))
console.log(JSON.stringify({ outFile, notesFile, counts: notes.counts, generatedMedia: notes.reviewRequired.generatedMedia.length }, null, 2))
