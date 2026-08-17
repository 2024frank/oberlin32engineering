# Oberlin Engineering Club Next.js Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Oberlin Engineering Club public website and officer/admin portal as a single Next.js App Router application backed by Supabase, with a structured CMS, Draft → Preview → Publish workflow, version history, protected roles, and migration of valid content from the existing Astro/Supabase site.

**Architecture:** One Next.js application contains the public site, `/admin`, authenticated draft preview routes, and route handlers. Public structured content remains normalized in PostgreSQL; admin edits are staged in generic draft records and transactionally published into canonical tables with immutable revision snapshots. Page-builder content uses typed section schemas, editable draft sections, and immutable page-version snapshots so preview and production share the same renderer without leaking drafts.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres/Auth/Storage, Zod, Vitest + Testing Library, Playwright, dnd-kit, CSS variables/modules, Vercel.

## Global Constraints

- The public brand is **Oberlin Engineering Club (OEC)**, not Oberlin 3-2 Engineering Society.
- The **3-2 Pathway** remains a dedicated top-level destination, but it is one resource within the broader club.
- Launch includes invite-only staff accounts and approved `@oberlin.edu` member accounts. Member/community implementation is specified in `docs/superpowers/plans/2026-08-17-oec-member-staff-project-platform.md`.
- Global staff roles are `SUPER_ADMIN`, `ADMIN`, and `EDITOR`; approved students use member lifecycle states, and `PROJECT_LEAD` is project-scoped rather than a global staff role.
- Normal public-site content changes must not require React/TypeScript edits or a redeploy.
- The page builder is structured: admins may reorder/hide/show approved sections and choose approved layouts, but may not inject arbitrary CSS, arbitrary HTML, or unconstrained design tokens.
- Publishing workflow is exactly **Edit → Save Draft → Preview → Publish**.
- Drafts must never appear in anonymous/public queries.
- Preview must use the same rendering components as the published page.
- Publishing and restore operations must create immutable version records and be transactional.
- Public content must not present proposed projects, tentative events, unconfirmed partnerships, unsupported impact claims, or club-authored 3-2 guidance as established/official fact.
- Public and admin interfaces must support desktop, tablet, and mobile; complex page-building may optimize for desktop/tablet.
- Supabase service-role credentials must never be exposed to the browser.
- The official horizontal squirrel + wordmark is the primary site/header mark; the circular badge is the compact mark.
- The current Astro/Supabase production site stays available until acceptance and cutover checks pass.

---

## File Structure Map

The implementation will create the following focused boundaries:

```text
app/
  (public)/
    layout.tsx                         Public site chrome
    page.tsx                           CMS-driven home page
    about/page.tsx
    projects/page.tsx
    projects/[slug]/page.tsx
    events/page.tsx
    events/[slug]/page.tsx
    opportunities/page.tsx
    resources/page.tsx
    pathway/page.tsx
    news/page.tsx
    news/[slug]/page.tsx
    get-involved/page.tsx
  admin/
    layout.tsx                         Admin root layout
    (auth)/login/page.tsx              Officer sign-in
    (portal)/layout.tsx                Authenticated admin shell
    (portal)/page.tsx                  Dashboard
    (portal)/pages/page.tsx
    (portal)/pages/[slug]/page.tsx
    (portal)/projects/page.tsx
    (portal)/project-updates/page.tsx
    (portal)/events/page.tsx
    (portal)/opportunities/page.tsx
    (portal)/news/page.tsx
    (portal)/leadership/page.tsx
    (portal)/resources/page.tsx
    (portal)/documents/page.tsx
    (portal)/sponsors/page.tsx
    (portal)/submissions/page.tsx
    (portal)/media/page.tsx
    (portal)/navigation/page.tsx
    (portal)/settings/page.tsx
    (portal)/users/page.tsx
    (portal)/audit/page.tsx
  preview/[slug]/page.tsx              Authenticated draft preview
  api/
    submissions/route.ts
    media/route.ts
    publish/page/route.ts
    publish/content/route.ts
    restore/page/route.ts
    restore/content/route.ts
    cron/publish/route.ts
  sitemap.ts
  robots.ts
components/
  brand/                               Logo + brand primitives
  public/                              Public-only UI
  admin/                               Portal-only UI
  page-builder/                        Registry, renderer, editors
  forms/                               Public/admin forms
  ui/                                  Shared accessible primitives
lib/
  auth/                                Session + role gates
  content/                             Public structured-content readers
  cms/                                 Draft/revision services
  page-builder/                        Schemas + page data services
  permissions/                         Role/scope evaluation
  publishing/                          Transactional publish/restore calls
  submissions/                         Validation/rate-limit helpers
  supabase/                            Browser/server/admin clients
  validation/                          Entity schemas/status integrity rules
  seo/                                 Metadata helpers
database/
  migrations/                          Ordered SQL migrations
  policies/                            RLS regression SQL where useful
  seed/                                Seed SQL/data
scripts/
  migrate-legacy.ts                    Legacy content transform
  verify-migration.ts                  Migration assertions
  seed-brand-assets.ts                 Protected logo metadata bootstrap
tests/
  unit/
  integration/
  rls/
  e2e/
public/
  brand/oec-horizontal.png
  brand/oec-badge.png
  images/
docs/
  ADMIN_OPERATIONS.md
  MIGRATION_RUNBOOK.md
  DEPLOYMENT.md
vercel.json
```

---

### Task 1: Scaffold the Next.js application, test harness, and brand foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/(public)/layout.tsx`
- Create: `components/brand/BrandLogo.tsx`
- Create: `components/public/PublicHeader.tsx`
- Create: `components/public/PublicFooter.tsx`
- Copy: `/mnt/data/B9F7A99A-4A3B-4529-A6AF-26F7F8459778.png` → `public/brand/oec-badge.png`
- Copy: `/mnt/data/D6E2B0F2-AE2F-41E8-A6D8-06AA88CAF8AA.jpeg` → `public/brand/oec-horizontal.jpg`
- Test: `tests/unit/public-shell.test.tsx`

**Interfaces:**
- Consumes: approved OEC brand assets from the conversation.
- Produces: `BrandLogo({ variant: 'horizontal' | 'badge' })`, public layout shell, CSS design tokens, Vitest/Playwright commands used by every later task.

- [ ] **Step 1: Install the runtime and test dependencies**

Run:

```bash
npm init -y
npm install next react react-dom @supabase/supabase-js @supabase/ssr zod clsx lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sharp
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react playwright @playwright/test supabase
```

Then set scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

- [ ] **Step 2: Write the failing public-shell test**

```tsx
import { render, screen } from '@testing-library/react'
import { PublicHeader } from '@/components/public/PublicHeader'

it('renders OEC branding and the required top-level navigation', () => {
  render(<PublicHeader />)
  expect(screen.getByRole('img', { name: /oberlin engineering club/i })).toBeInTheDocument()
  for (const label of ['Home', 'About', 'Projects', 'Events', 'Opportunities', 'Resources', '3-2 Pathway', 'News', 'Get Involved']) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
  }
})
```

- [ ] **Step 3: Run the unit test and verify failure**

Run: `npm test -- tests/unit/public-shell.test.tsx`

Expected: FAIL because `PublicHeader` does not exist.

- [ ] **Step 4: Implement the minimal branded shell**

Create `BrandLogo.tsx` with exact variant behavior:

```tsx
import Image from 'next/image'

export function BrandLogo({ variant = 'horizontal' }: { variant?: 'horizontal' | 'badge' }) {
  const badge = variant === 'badge'
  return (
    <Image
      src={badge ? '/brand/oec-badge.png' : '/brand/oec-horizontal.jpg'}
      alt="Oberlin Engineering Club"
      width={badge ? 96 : 360}
      height={badge ? 96 : 120}
      priority
    />
  )
}
```

Define CSS tokens in `app/globals.css`:

```css
:root {
  --oec-cardinal: #8d0d12;
  --oec-gold: #c18a22;
  --oec-charcoal: #292928;
  --oec-cream: #fcf7f1;
  --oec-white: #ffffff;
  --oec-border: color-mix(in srgb, var(--oec-charcoal) 18%, transparent);
  --oec-radius-sm: 0.5rem;
  --oec-radius-md: 1rem;
  --oec-radius-lg: 1.5rem;
  --oec-content: 76rem;
}
```

Implement `PublicHeader` with the required nav labels and `PublicFooter` with editable-content placeholders only at the component API level, not hardcoded CMS logic yet.

- [ ] **Step 5: Run tests, typecheck, and build**

Run:

```bash
npm test -- tests/unit/public-shell.test.tsx
npm run typecheck
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts playwright.config.ts app components public tests
git commit -m "feat: scaffold OEC Next.js platform"
```

---

### Task 2: Create the Supabase schema, role model, and RLS foundation

**Files:**
- Create: `database/migrations/001_core.sql`
- Create: `database/migrations/002_content.sql`
- Create: `database/migrations/003_cms.sql`
- Create: `database/migrations/004_rls.sql`
- Create: `database/seed/001_site.sql`
- Create: `tests/rls/role-matrix.sql`
- Create: `lib/permissions/types.ts`
- Create: `lib/permissions/can.ts`
- Test: `tests/unit/permissions.test.ts`

**Interfaces:**
- Consumes: Supabase Auth user IDs.
- Produces: `AdminRole`, `Permission`, `can(role, permission, scope?)`, normalized public content tables, draft/version tables, and RLS functions used by all server routes.

- [ ] **Step 1: Write permission tests first**

```ts
import { can } from '@/lib/permissions/can'

it('gives SUPER_ADMIN full system authority', () => {
  expect(can('SUPER_ADMIN', 'MANAGE_USERS')).toBe(true)
  expect(can('SUPER_ADMIN', 'PUBLISH_CONTENT')).toBe(true)
})

it('blocks non-super-admin roles from critical system administration', () => {
  expect(can('ADMIN', 'MANAGE_SITE_SETTINGS')).toBe(false)
  expect(can('EDITOR', 'MANAGE_USERS')).toBe(false)
  expect(can('EDITOR', 'MANAGE_SITE_SETTINGS')).toBe(false)
})

it('allows an editor to edit only an assigned scope', () => {
  expect(can('EDITOR', 'EDIT_CONTENT', ['projects'], 'projects')).toBe(true)
  expect(can('EDITOR', 'EDIT_CONTENT', ['projects'], 'events')).toBe(false)
})
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/permissions.test.ts`

Expected: FAIL because permission helpers do not exist.

- [ ] **Step 3: Implement role types and pure permission logic**

```ts
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'
export type Permission =
  | 'MANAGE_USERS'
  | 'MANAGE_SITE_SETTINGS'
  | 'EDIT_CONTENT'
  | 'PUBLISH_CONTENT'
  | 'REVIEW_SUBMISSIONS'
  | 'VIEW_AUDIT'

export function can(
  role: AdminRole,
  permission: Permission,
  scopes: string[] = [],
  requestedScope?: string,
): boolean {
  if (role === 'SUPER_ADMIN') return true
  if (role === 'ADMIN') return !['MANAGE_USERS', 'MANAGE_SITE_SETTINGS'].includes(permission)
  if (permission === 'EDIT_CONTENT') return !!requestedScope && scopes.includes(requestedScope)
  return false
}
```

- [ ] **Step 4: Create core SQL types and admin tables**

`001_core.sql` must create:

```sql
create type public.admin_role as enum ('SUPER_ADMIN', 'ADMIN', 'EDITOR');

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_assignments (
  user_id uuid primary key references public.admin_profiles(user_id) on delete cascade,
  role public.admin_role not null default 'EDITOR',
  scopes text[] not null default '{}',
  can_publish boolean not null default false,
  updated_at timestamptz not null default now()
);
```

Also create `private.current_role()`, `private.is_staff()`, and `private.is_super_admin()` as `security definer` functions with an empty `search_path` and explicit schema references.

- [ ] **Step 5: Create normalized content tables**

`002_content.sql` creates these canonical/public tables with `publication_state text check (...)`, `published_at`, timestamps, and fields required by the approved spec:

```text
projects
project_updates
events
opportunities
resources
news_posts
leaders
sponsors
documents
partner_schools
submissions
media
navigation_items
site_settings
```

Use stable UUID primary keys for new records and unique slugs where public detail routes require them. Preserve useful legacy columns during migration through explicit mapper code rather than keeping the old text IDs as the new primary key.

- [ ] **Step 6: Create CMS draft/version tables**

`003_cms.sql` creates:

```sql
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.page_drafts (
  page_id uuid primary key references public.pages(id) on delete cascade,
  title text not null,
  seo_title text not null default '',
  seo_description text not null default '',
  og_media_id uuid,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  stable_key text not null,
  section_type text not null,
  sort_order integer not null,
  is_visible boolean not null default true,
  draft_payload jsonb not null,
  unique(page_id, stable_key)
);

create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  version_number integer not null,
  page_snapshot jsonb not null,
  sections_snapshot jsonb not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  restored_from uuid references public.page_versions(id),
  unique(page_id, version_number)
);

alter table public.pages
  add constraint pages_published_version_fk
  foreign key (published_version_id) references public.page_versions(id);

create table public.content_drafts (
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(entity_type, entity_id)
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  version_number integer not null,
  snapshot jsonb not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  restored_from uuid references public.content_versions(id),
  unique(entity_type, entity_id, version_number)
);

create table public.scheduled_publications (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  scheduled_for timestamptz not null,
  payload_snapshot jsonb not null,
  requested_by uuid references auth.users(id),
  processed_at timestamptz,
  failure_message text
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 7: Add RLS and regression SQL**

`004_rls.sql` must enforce these boundaries:

```text
anon: select only publication_state='published' canonical content plus page identities/page_versions referenced by pages.published_version_id; anon has no access to page_drafts or page_sections
EDITOR: read admin data; write content_drafts/page_sections only for assigned scopes; never users/settings unless explicitly allowed
ADMIN: manage content/submissions and publish; cannot create/modify SUPER_ADMIN assignments
SUPER_ADMIN: all admin operations
```

`tests/rls/role-matrix.sql` must use `set local role anon/authenticated` plus JWT claim fixtures and assert that anonymous draft reads return zero rows while published reads succeed.

- [ ] **Step 8: Run unit tests and SQL smoke checks**

Run:

```bash
npm test -- tests/unit/permissions.test.ts
supabase db reset
psql "$LOCAL_SUPABASE_DB_URL" -f tests/rls/role-matrix.sql
```

Expected: PASS; anonymous draft reads return zero rows.

- [ ] **Step 9: Commit**

```bash
git add database lib/permissions tests/unit/permissions.test.ts tests/rls
git commit -m "feat: add OEC database and role security model"
```

---

### Task 3: Add Supabase server/browser clients and authenticated admin route protection

**Files:**
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/auth/session.ts`
- Create: `lib/auth/requireRole.ts`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/(auth)/login/page.tsx`
- Create: `app/admin/(portal)/layout.tsx`
- Create: `components/admin/AdminShell.tsx`
- Create: `components/admin/AdminSidebar.tsx`
- Test: `tests/unit/require-role.test.ts`
- E2E: `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Consumes: `AdminRole`, Supabase session cookies.
- Produces: `getCurrentAdmin()`, `requireAdmin()`, `requireRole(minimumRole)`, pure `requireRoleFromRecord(record, minimumRole)` test seam, and protected `/admin` shell.

- [ ] **Step 1: Write failing role-gate tests**

```ts
it('rejects a user with no active admin profile', async () => {
  await expect(requireRoleFromRecord(null, 'EDITOR')).rejects.toThrow('ADMIN_ACCESS_REQUIRED')
})

it('accepts SUPER_ADMIN when ADMIN is required', async () => {
  await expect(requireRoleFromRecord({ role: 'SUPER_ADMIN', active: true }, 'ADMIN')).resolves.toMatchObject({ role: 'SUPER_ADMIN' })
})
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/require-role.test.ts`

Expected: FAIL because auth helpers do not exist.

- [ ] **Step 3: Implement clients with strict credential separation**

`browser.ts` uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

`server.ts` uses `@supabase/ssr` cookie-based SSR client.

`admin.ts` is server-only and must begin with:

```ts
import 'server-only'
```

It creates the service-role client from `SUPABASE_SERVICE_ROLE_KEY` and must never be imported by a client component.

- [ ] **Step 4: Implement login and protected admin shell**

`app/admin/layout.tsx` provides only the admin root document chrome. `app/admin/(portal)/layout.tsx` calls `requireAdmin()` before rendering `AdminShell`; `app/admin/(auth)/login/page.tsx` remains outside that gated route group while still resolving to `/admin/login`. The shell uses the approved alternate direction: charcoal sidebar, cream workspace, cardinal actions, gold accents, and the horizontal OEC logo.

- [ ] **Step 5: Add E2E auth coverage**

```ts
test('anonymous visitors are redirected from admin', async ({ page }) => {
  await page.goto('/admin/projects')
  await expect(page).toHaveURL(/\/admin\/login/)
})
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/unit/require-role.test.ts
npm run test:e2e -- tests/e2e/admin-auth.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/supabase lib/auth app/admin components/admin tests
git commit -m "feat: protect officer admin portal"
```

---

### Task 4: Build typed page-builder block schemas and the shared renderer

**Files:**
- Create: `lib/page-builder/types.ts`
- Create: `lib/page-builder/registry.ts`
- Create: `lib/page-builder/schemas/common.ts`
- Create: `lib/page-builder/schemas/hero.ts`
- Create: `lib/page-builder/schemas/content.ts`
- Create: `lib/page-builder/schemas/engineering.ts`
- Create: `lib/page-builder/schemas/community.ts`
- Create: `lib/page-builder/schemas/cta.ts`
- Create: `components/page-builder/PageRenderer.tsx`
- Create: `components/page-builder/sections/HeroSection.tsx`
- Create: `components/page-builder/sections/TextImageSection.tsx`
- Create: `components/page-builder/sections/StatisticsSection.tsx`
- Create: `components/page-builder/sections/FeaturesGridSection.tsx`
- Create: `components/page-builder/sections/RichTextSection.tsx`
- Create: `components/page-builder/sections/QuoteSection.tsx`
- Create: `components/page-builder/sections/GallerySection.tsx`
- Create: `components/page-builder/sections/ProjectGridSection.tsx`
- Create: `components/page-builder/sections/ProjectSpotlightSection.tsx`
- Create: `components/page-builder/sections/DisciplineGridSection.tsx`
- Create: `components/page-builder/sections/ProjectTimelineSection.tsx`
- Create: `components/page-builder/sections/LeadershipGridSection.tsx`
- Create: `components/page-builder/sections/EventListSection.tsx`
- Create: `components/page-builder/sections/OpportunityListSection.tsx`
- Create: `components/page-builder/sections/NewsGridSection.tsx`
- Create: `components/page-builder/sections/SponsorGridSection.tsx`
- Create: `components/page-builder/sections/CtaSection.tsx`
- Create: `tests/unit/page-builder-schemas.test.ts`
- Create: `tests/unit/page-renderer.test.tsx`

**Interfaces:**
- Consumes: page-version snapshots or draft section arrays.
- Produces: `PageSection`, `PageSnapshot`, `validateSection(section)`, `sectionRegistry`, `PageRenderer({ sections })` used by both public and preview routes.

- [ ] **Step 1: Define the discriminated union in the failing test**

Test required types and invalid payload rejection:

```ts
const invalidHero = { type: 'hero', layout: 'split', headline: '', primaryCta: { label: '', href: '' } }
expect(() => validateSection(invalidHero)).toThrow()
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/page-builder-schemas.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement approved block schemas**

Create Zod schemas for exactly these launch block types:

```text
hero
text_image
statistics
features_grid
rich_text
quote
gallery
project_grid
project_spotlight
discipline_grid
project_timeline
leadership_grid
event_list
opportunity_list
news_grid
sponsor_grid
cta
```

Example hero schema:

```ts
export const heroSchema = z.object({
  type: z.literal('hero'),
  layout: z.enum(['image', 'split', 'minimal']),
  eyebrow: z.string().max(80).default(''),
  headline: z.string().min(1).max(140),
  body: z.string().max(500).default(''),
  imageId: z.string().uuid().nullable().default(null),
  primaryCta: ctaLinkSchema.optional(),
  secondaryCta: ctaLinkSchema.optional(),
})
```

- [ ] **Step 4: Build the registry and shared renderer**

`registry.ts` maps each section type to both its schema and React component. `PageRenderer` accepts only validated sections and skips `isVisible === false`.

```ts
export const sectionRegistry = {
  hero: { schema: heroSchema, component: HeroSection },
  project_grid: { schema: projectGridSchema, component: ProjectGridSection },
  // include every launch type explicitly
} as const
```

- [ ] **Step 5: Prove public and preview can share the renderer**

`tests/unit/page-renderer.test.tsx` renders one snapshot with `PageRenderer` and asserts headline, CTA, and referenced entity-grid placeholder behavior.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- tests/unit/page-builder-schemas.test.ts tests/unit/page-renderer.test.tsx
git add lib/page-builder components/page-builder tests/unit
git commit -m "feat: add structured OEC page builder registry"
```

---

### Task 5: Implement page draft, publish, restore, and scheduled-publication services

**Files:**
- Create: `lib/page-builder/pageService.ts`
- Create: `lib/publishing/pages.ts`
- Create: `database/migrations/005_page_publish_functions.sql`
- Create: `app/api/publish/page/route.ts`
- Create: `app/api/restore/page/route.ts`
- Create: `app/api/cron/publish/route.ts`
- Create: `vercel.json`
- Test: `tests/unit/page-publishing.test.ts`
- Integration: `tests/integration/page-publishing.test.ts`

**Interfaces:**
- Consumes: `PageSnapshot`, authenticated admin identity.
- Produces: `savePageDraft`, `getDraftPage`, `getPublishedPage`, `publishPageDraft`, `publishPageSnapshot`, `restorePageVersion`, scheduled publish processor.

- [ ] **Step 1: Write a failing publish-validation test**

```ts
it('refuses to publish a page with an invalid visible section', async () => {
  await expect(publishPageDraft(pageIdWithBlankHero, adminId)).rejects.toThrow('PAGE_VALIDATION_FAILED')
})
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/page-publishing.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement database publish function transactionally**

`005_page_publish_functions.sql` creates `public.publish_page_snapshot(p_page_id uuid, p_page_snapshot jsonb, p_sections_snapshot jsonb, p_restored_from uuid default null)` that:

1. verifies staff/publish authority,
2. locks the page identity row `for update`,
3. computes next `version_number`,
4. inserts the already server-validated immutable `page_versions` snapshot,
5. updates `pages.published_version_id`,
6. inserts one `audit_log` record,
7. returns the new version ID.

`publishPageDraft` loads `page_drafts` + ordered `page_sections`, validates the full snapshot with Zod, then calls `publish_page_snapshot`; a concurrent draft edit after the load cannot change the snapshot being published. Restore creates a **new** version by calling the same function with a selected historical snapshot and `p_restored_from`; it never mutates historical version rows.

- [ ] **Step 4: Implement service-layer Zod validation before calling RPC**

```ts
export async function publishPageDraft(pageId: string, actorId: string) {
  const draft = await getDraftPage(pageId)
  const parsed = pageSnapshotSchema.parse(draft)
  return publishPageSnapshot(parsed, actorId)
}
```

- [ ] **Step 5: Implement scheduled publication endpoint**

Use `/api/cron/publish` and a `CRON_SECRET` authorization check. `vercel.json` schedules a production call every 15 minutes:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/publish", "schedule": "*/15 * * * *" }]
}
```

The processor claims due `scheduled_publications` rows with row locking, validates the stored snapshot, calls `publishPageSnapshot` for page targets, and records `processed_at` or `failure_message`. It never re-reads mutable page drafts when processing a scheduled snapshot.

- [ ] **Step 6: Test atomicity and draft isolation**

Integration test must assert:

```text
before publish: anonymous public loader returns previous version
publish succeeds: anonymous loader returns new version
publish validation fails: pages.published_version_id is unchanged
restore succeeds: version count increases by one and public loader matches restored snapshot
```

- [ ] **Step 7: Run and commit**

```bash
npm test -- tests/unit/page-publishing.test.ts tests/integration/page-publishing.test.ts
git add lib/page-builder lib/publishing database/migrations/005_page_publish_functions.sql app/api vercel.json tests
git commit -m "feat: add draft preview publish version workflow"
```

---

### Task 6: Implement structured-content drafts, publishing, versioning, and integrity validation

**Files:**
- Create: `lib/validation/projects.ts`
- Create: `lib/validation/events.ts`
- Create: `lib/validation/opportunities.ts`
- Create: `lib/validation/resources.ts`
- Create: `lib/validation/news.ts`
- Create: `lib/validation/leaders.ts`
- Create: `lib/cms/contentDrafts.ts`
- Create: `lib/publishing/content.ts`
- Create: `database/migrations/006_content_publish_functions.sql`
- Create: `app/api/publish/content/route.ts`
- Create: `app/api/restore/content/route.ts`
- Test: `tests/unit/content-integrity.test.ts`
- Integration: `tests/integration/content-publishing.test.ts`

**Interfaces:**
- Consumes: canonical content table record + generic `content_drafts` payload.
- Produces: `saveContentDraft`, `publishContentDraft`, `publishContentSnapshot`, `restoreContentVersion`, canonical public rows that never change until publish.

- [ ] **Step 1: Write integrity tests for reality-sensitive statuses**

```ts
it('requires active projects to have a real lead and next step', () => {
  expect(() => projectPublishSchema.parse({
    title: 'Robot Arm', status: 'active', leadName: '', nextStep: ''
  })).toThrow()
})

it('requires a published event to have confirmed start time, organizer, and location/access info', () => {
  expect(() => eventPublishSchema.parse({
    title: 'Build Night', startAt: null, organizerName: '', location: ''
  })).toThrow()
})
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/content-integrity.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement schemas and status vocabulary**

Projects use exactly:

```ts
z.enum(['proposed', 'open_for_interest', 'scoping', 'active', 'complete'])
```

Events require `startAt`, organizer, and access/location before publish. 3-2 resources include `officialSource: boolean` and `sourceUrl`; club-authored guidance cannot set `officialSource=true`.

- [ ] **Step 4: Implement generic draft service**

```ts
export async function saveContentDraft<T>(
  entityType: ContentEntityType,
  entityId: string,
  payload: T,
  actorId: string,
): Promise<void>
```

It upserts `content_drafts` only and never updates canonical public fields.

- [ ] **Step 5: Implement transactional publication RPC**

Create `publish_content_snapshot(entity_type, entity_id, payload_snapshot)` with a strict entity-type allowlist. It locks the canonical row, inserts a `content_versions` snapshot, updates the normalized canonical table, marks `publication_state='published'`, and writes `audit_log` in one transaction. `publishContentDraft` loads and validates `content_drafts.payload`, then calls this snapshot RPC and removes that exact consumed draft only when its `updated_at` still matches the loaded draft, so a newer concurrent draft is not erased.

- [ ] **Step 6: Extend scheduled publication to structured content**

Update the cron processor from Task 5 so `target_type='page'` calls `publishPageSnapshot` and supported structured entity types call `publishContentSnapshot` with `scheduled_publications.payload_snapshot`. Scheduled payloads are immutable snapshots captured at scheduling time; later unscheduled draft edits do not alter what will publish.

- [ ] **Step 7: Prove published records remain stable while a draft changes**

Integration test sequence:

```text
publish Project A title "Original"
save draft title "Changed"
anonymous read still returns "Original"
publish draft
anonymous read returns "Changed"
restore version 1
anonymous read returns "Original"
```

- [ ] **Step 8: Run and commit**

```bash
npm test -- tests/unit/content-integrity.test.ts tests/integration/content-publishing.test.ts
git add lib/validation lib/cms lib/publishing database/migrations/006_content_publish_functions.sql app/api tests
git commit -m "feat: add versioned structured content publishing"
```

---

### Task 7: Build the Supabase Storage media library with protected brand assets and usage tracking

**Files:**
- Create: `database/migrations/007_media.sql`
- Create: `lib/cms/media.ts`
- Create: `app/api/media/route.ts`
- Create: `app/admin/(portal)/media/page.tsx`
- Create: `components/admin/media/MediaLibrary.tsx`
- Create: `components/admin/media/MediaPicker.tsx`
- Create: `scripts/seed-brand-assets.ts`
- Test: `tests/unit/media-validation.test.ts`
- Integration: `tests/integration/media.test.ts`

**Interfaces:**
- Produces: `MediaAsset`, `listMedia`, `uploadMedia`, `updateMediaMetadata`, `getMediaUsage`, `MediaPicker`.

- [ ] **Step 1: Write validation tests**

```ts
expect(validateMediaUpload({ mime: 'image/png', size: 2_000_000 })).toEqual({ ok: true })
expect(validateMediaUpload({ mime: 'application/x-msdownload', size: 1_000 })).toEqual({ ok: false, reason: 'UNSUPPORTED_TYPE' })
```

- [ ] **Step 2: Implement metadata and usage schema**

Add to `media`: `alt_text`, `caption`, `tags text[]`, `width`, `height`, `protected boolean`, `content_hash`.

Create `media_usage(media_id, owner_type, owner_id, field_key)` with unique constraint to support “where is this image used?” before deletion/replacement.

- [ ] **Step 3: Implement server-only upload endpoint**

The route validates authenticated role, file type/size, writes to Supabase Storage, extracts image dimensions where available, creates metadata row, and cleans up the storage object if the metadata insert fails.

- [ ] **Step 4: Seed protected OEC logos**

`seed-brand-assets.ts` uploads `public/brand/oec-horizontal.jpg` and `public/brand/oec-badge.png` once, stores content hashes, and marks both `protected=true`. Delete operations must reject protected assets.

- [ ] **Step 5: Build Media Library and Picker UI**

The picker supports search, tags, current usage, alt text, and selection. It does not permit an editor to bypass the protected brand rules.

- [ ] **Step 6: Test failed upload draft safety**

Integration test: simulate storage success + metadata failure and assert orphan cleanup; simulate upload failure while an admin editor has unsaved form state and assert the form state remains unchanged.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/007_media.sql lib/cms/media.ts app/api/media 'app/admin/(portal)/media' components/admin/media scripts/seed-brand-assets.ts tests
git commit -m "feat: add managed OEC media library"
```

---

### Task 8: Build the public CMS renderer, navigation, SEO, and home/about/pathway pages

**Files:**
- Create: `lib/page-builder/publicPages.ts`
- Create: `lib/seo/metadata.ts`
- Create: `app/(public)/page.tsx`
- Create: `app/(public)/about/page.tsx`
- Create: `app/(public)/pathway/page.tsx`
- Create: `components/public/CmsPage.tsx`
- Create: `components/public/AnnouncementBanner.tsx`
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Test: `tests/unit/public-page-loader.test.ts`

**Interfaces:**
- Consumes: only `pages.published_version_id` and published navigation/settings.
- Produces: `getPublishedPageBySlug`, `CmsPage`, CMS-controlled navigation and metadata.

- [ ] **Step 1: Write a draft-leakage unit test around the loader**

```ts
it('returns only the version referenced by published_version_id', async () => {
  const page = await getPublishedPageBySlug('home', fakePublishedRepo)
  expect(page.sections[0].headline).toBe('Published headline')
  expect(JSON.stringify(page)).not.toContain('Unpublished draft headline')
})
```

- [ ] **Step 2: Implement public loader with no draft-table dependency**

`getPublishedPageBySlug` may query `pages`, `page_versions`, published navigation, media, and canonical published structured content. It must not query `page_drafts`, `page_sections`, or `content_drafts`.

- [ ] **Step 3: Implement CMS-controlled public routes**

Home, About, and Pathway use the same `CmsPage` + `PageRenderer`. Seed content in `database/seed/001_site.sql` includes:

```text
home
about
pathway
get-involved
```

The 3-2 page includes a visible source/advising notice and official-source links.

- [ ] **Step 4: Implement dynamic metadata from CMS**

`generateMetadata` reads published `seo_title`, `seo_description`, OG image, and canonical slug; `sitemap.ts` emits published static pages and published content detail URLs.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- tests/unit/public-page-loader.test.ts
npm run build
git add lib/page-builder/publicPages.ts lib/seo app components/public database/seed/001_site.sql tests
git commit -m "feat: render public OEC pages from published CMS versions"
```

---

### Task 9: Build Projects, Events, Opportunities, Resources, and News public experiences

**Files:**
- Create: `lib/content/projects.ts`
- Create: `lib/content/events.ts`
- Create: `lib/content/opportunities.ts`
- Create: `lib/content/resources.ts`
- Create: `lib/content/news.ts`
- Create: `app/(public)/projects/page.tsx`
- Create: `app/(public)/projects/[slug]/page.tsx`
- Create: `app/(public)/events/page.tsx`
- Create: `app/(public)/events/[slug]/page.tsx`
- Create: `app/(public)/opportunities/page.tsx`
- Create: `app/(public)/resources/page.tsx`
- Create: `app/(public)/news/page.tsx`
- Create: `app/(public)/news/[slug]/page.tsx`
- Create: `components/public/filters/ProjectFilters.tsx`
- Create: `components/public/filters/EventFilters.tsx`
- Create: `components/public/filters/OpportunityFilters.tsx`
- Create: `components/public/filters/ResourceFilters.tsx`
- Test: `tests/unit/public-content-filters.test.ts`

**Interfaces:**
- Produces server-side readers that always enforce published state plus filter parsers for URL search params.

- [ ] **Step 1: Write filter tests**

```ts
expect(parseProjectFilters(new URLSearchParams('status=active&discipline=robotics'))).toEqual({
  status: 'active', discipline: 'robotics', recruiting: undefined, skills: []
})
```

- [ ] **Step 2: Implement server readers and URL-driven filters**

Projects filter by discipline, status, skills, and recruiting state. Events separate upcoming/past using `start_at`. Opportunities filter by type and deadline. Resources filter by category. News orders by publication date.

- [ ] **Step 3: Build detail pages**

Project detail renders problem, goal, team, disciplines, timeline, project updates, media, documentation, external/GitHub links, and interest CTA only when corresponding published fields exist.

Event detail renders confirmed date/time, organizer, access/location, and registration link.

- [ ] **Step 4: Add empty/loading/error states**

Every directory includes a useful empty state and never invents counts, dates, partners, or project activity.

- [ ] **Step 5: Run tests/build and commit**

```bash
npm test -- tests/unit/public-content-filters.test.ts
npm run build
git add lib/content 'app/(public)' components/public/filters tests
git commit -m "feat: add public engineering directories and detail pages"
```

---

### Task 10: Add spam-resistant public Get Involved and project-interest forms

**Files:**
- Create: `lib/submissions/schema.ts`
- Create: `lib/submissions/rateLimit.ts`
- Create: `database/migrations/008_submissions.sql`
- Create: `app/api/submissions/route.ts`
- Create: `components/forms/GetInvolvedForm.tsx`
- Create: `components/forms/ProjectInterestForm.tsx`
- Create: `app/(public)/get-involved/page.tsx`
- Test: `tests/unit/submission-validation.test.ts`
- Integration: `tests/integration/submissions.test.ts`

**Interfaces:**
- Produces `submissionSchema`, `submitPublicForm`, database rows with types: `join_club`, `join_project`, `propose_project`, `leadership_interest`, `event_volunteer`, `partnership_inquiry`.

- [ ] **Step 1: Write validation and honeypot tests**

```ts
expect(() => submissionSchema.parse({ type: 'join_club', fullName: '', email: 'bad' })).toThrow()
expect(isSpam({ honeypot: 'filled', formStartedAt: Date.now() - 5000 })).toBe(true)
expect(isSpam({ honeypot: '', formStartedAt: Date.now() - 5000 })).toBe(false)
```

- [ ] **Step 2: Add database rate-limit buckets**

Create `submission_rate_limits(network_hash, bucket_start, request_count)` and an RPC that atomically increments a 15-minute bucket. Hash the network address server-side using `SUBMISSION_SALT`; never store the raw address.

- [ ] **Step 3: Implement server route**

The route rejects oversized payloads, invalid type-specific fields, filled honeypots, unrealistically fast submissions, and rate-limit overflow; successful requests insert only validated payload fields.

- [ ] **Step 4: Build accessible forms**

Forms expose field-level errors, submission status, keyboard focus on the first invalid field, and a success state without requiring a user account.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- tests/unit/submission-validation.test.ts tests/integration/submissions.test.ts
git add lib/submissions database/migrations/008_submissions.sql app/api/submissions components/forms 'app/(public)/get-involved' tests
git commit -m "feat: add protected public involvement forms"
```

---

### Task 11: Build the admin dashboard and reusable data-management shell

**Files:**
- Create: `app/admin/(portal)/page.tsx`
- Create: `components/admin/DashboardCards.tsx`
- Create: `components/admin/ActivityFeed.tsx`
- Create: `components/admin/DataTable.tsx`
- Create: `components/admin/EditorDrawer.tsx`
- Create: `components/ui/Dialog.tsx`
- Create: `components/ui/Toast.tsx`
- Create: `lib/cms/dashboard.ts`
- Test: `tests/unit/admin-dashboard.test.tsx`

**Interfaces:**
- Produces reusable `DataTable<T>`, `EditorDrawer`, dashboard summary loader, and confirmation/toast primitives used by later admin managers.

- [ ] **Step 1: Write dashboard test for operational metrics**

Assert cards for:

```text
New submissions
Drafts awaiting publication
Upcoming events
Active projects
Opportunities nearing deadline
Scheduled publications
```

- [ ] **Step 2: Implement dashboard query**

Use exact database states rather than fabricated metrics. “Active projects” counts only canonical projects with `status='active'` and `publication_state='published'`. “Drafts” counts `content_drafts` plus pages with draft sections differing from their published version.

- [ ] **Step 3: Build responsive admin shell primitives**

Desktop: persistent charcoal sidebar. Mobile: accessible drawer. Dialog focus is trapped/restored; destructive confirmation requires explicit button action.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/unit/admin-dashboard.test.tsx
git add 'app/admin/(portal)/page.tsx' components/admin components/ui lib/cms/dashboard.ts tests
git commit -m "feat: add OEC officer dashboard shell"
```

---

### Task 12: Build dedicated admin managers for structured content and submissions

**Files:**
- Create: `app/admin/(portal)/projects/page.tsx`
- Create: `app/admin/(portal)/project-updates/page.tsx`
- Create: `app/admin/(portal)/events/page.tsx`
- Create: `app/admin/(portal)/opportunities/page.tsx`
- Create: `app/admin/(portal)/news/page.tsx`
- Create: `app/admin/(portal)/leadership/page.tsx`
- Create: `app/admin/(portal)/resources/page.tsx`
- Create: `app/admin/(portal)/documents/page.tsx`
- Create: `app/admin/(portal)/sponsors/page.tsx`
- Create: `app/admin/(portal)/submissions/page.tsx`
- Create: `components/admin/content/ContentManager.tsx`
- Create: `components/admin/content/ProjectForm.tsx`
- Create: `components/admin/content/ProjectUpdateForm.tsx`
- Create: `components/admin/content/EventForm.tsx`
- Create: `components/admin/content/OpportunityForm.tsx`
- Create: `components/admin/content/NewsForm.tsx`
- Create: `components/admin/content/LeaderForm.tsx`
- Create: `components/admin/content/ResourceForm.tsx`
- Create: `components/admin/content/DocumentForm.tsx`
- Create: `components/admin/content/SponsorForm.tsx`
- Create: `components/admin/submissions/SubmissionInbox.tsx`
- Test: `tests/unit/content-manager.test.tsx`

**Interfaces:**
- Consumes: generic content-draft service and type-specific Zod schemas.
- Produces: dedicated CRUD/draft/publish interfaces for each structured entity.

- [ ] **Step 1: Write a manager test that proves Save does not Publish**

```tsx
await user.type(screen.getByLabelText('Title'), 'New project title')
await user.click(screen.getByRole('button', { name: 'Save draft' }))
expect(saveDraft).toHaveBeenCalled()
expect(publishDraft).not.toHaveBeenCalled()
```

- [ ] **Step 2: Implement shared ContentManager**

It accepts entity-specific column configuration, form component, allowed actions, and permission scope. Avoid one giant switch file; each entity form owns its schema-aware fields.

- [ ] **Step 3: Implement structured editors**

Projects, project updates, events, opportunities, news, leadership, resources, documents, and sponsors/collaborators each get a dedicated manager. Each editor offers `Save draft`, `Preview` where applicable, `Publish` when permitted, `Version history`, and `Restore` for published versions. Editor role sees Publish only when `can_publish=true` and the scope matches.

- [ ] **Step 4: Implement submission inbox**

Rows support `new → reviewed → archived`, show type-specific payload safely, and never expose raw network hashes. Bulk destructive actions are omitted at launch.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- tests/unit/content-manager.test.tsx
git add 'app/admin/(portal)' components/admin/content components/admin/submissions tests
git commit -m "feat: add admin content and submission managers"
```

---

### Task 13: Build the structured Website → Pages editor with drag reorder and draft preview

**Files:**
- Create: `app/admin/(portal)/pages/page.tsx`
- Create: `app/admin/(portal)/pages/[slug]/page.tsx`
- Create: `components/page-builder/admin/PageSectionList.tsx`
- Create: `components/page-builder/admin/SectionEditor.tsx`
- Create: `components/page-builder/admin/SectionPicker.tsx`
- Create: `components/page-builder/admin/editors/HeroEditor.tsx`
- Create: `components/page-builder/admin/editors/ContentEditor.tsx`
- Create: `components/page-builder/admin/editors/EngineeringEditor.tsx`
- Create: `components/page-builder/admin/editors/CommunityEditor.tsx`
- Create: `components/page-builder/admin/editors/CtaEditor.tsx`
- Create: `app/preview/[slug]/page.tsx`
- Test: `tests/unit/page-section-list.test.tsx`
- E2E: `tests/e2e/page-publishing-flow.spec.ts`

**Interfaces:**
- Consumes: `sectionRegistry`, page draft service, `PageRenderer`.
- Produces: no-code section reorder/hide/show/edit/add flow and authenticated preview.

- [ ] **Step 1: Write reorder/hide tests**

```tsx
expect(onReorder).toHaveBeenCalledWith(['hero', 'events', 'featured-projects'])
expect(onVisibilityChange).toHaveBeenCalledWith('events', false)
```

- [ ] **Step 2: Implement dnd-kit ordered section list**

Each row shows section label, visibility state, edit, duplicate where schema permits, and remove. Reordering updates `sort_order` in a single server mutation.

- [ ] **Step 3: Implement constrained section editors**

Editors render fields from explicit components per block type. Layout is chosen only from the schema enum. There is no freeform CSS field, arbitrary color input, or arbitrary component insertion.

- [ ] **Step 4: Implement authenticated preview using the production renderer**

`app/preview/[slug]/page.tsx` calls `requireAdmin()`, loads `page_sections`, validates them, and renders:

```tsx
<PageRenderer sections={draft.sections} mode="preview" />
```

The public page also renders `PageRenderer`, but from `page_versions`. No separate preview-specific section components are allowed.

- [ ] **Step 5: Write critical E2E flow**

```ts
test('edit → draft → preview → publish → public', async ({ page }) => {
  await loginAsSuperAdmin(page)
  await page.goto('/admin/pages/home')
  await page.getByRole('button', { name: /edit hero/i }).click()
  await page.getByLabel('Headline').fill('Build. Learn. Engineer Together.')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await page.getByRole('link', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Build. Learn. Engineer Together.' })).toBeVisible()
  await page.goto('/admin/pages/home')
  await page.getByRole('button', { name: 'Publish' }).click()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Build. Learn. Engineer Together.' })).toBeVisible()
})
```

- [ ] **Step 6: Run and commit**

```bash
npm test -- tests/unit/page-section-list.test.tsx
npm run test:e2e -- tests/e2e/page-publishing-flow.spec.ts
git add 'app/admin/(portal)/pages' app/preview components/page-builder/admin tests
git commit -m "feat: add no-code OEC website page editor"
```

---

### Task 14: Add navigation, site settings, officer roles, audit history, and global branding controls

**Files:**
- Create: `app/admin/(portal)/navigation/page.tsx`
- Create: `app/admin/(portal)/settings/page.tsx`
- Create: `app/admin/(portal)/users/page.tsx`
- Create: `app/admin/(portal)/audit/page.tsx`
- Create: `lib/cms/navigation.ts`
- Create: `lib/cms/siteSettings.ts`
- Create: `lib/cms/redirects.ts`
- Create: `database/migrations/009_redirect_rules.sql`
- Create: `app/(public)/[...legacy]/page.tsx`
- Create: `lib/auth/adminUsers.ts`
- Test: `tests/unit/system-admin.test.ts`
- E2E: `tests/e2e/role-boundaries.spec.ts`

**Interfaces:**
- Produces CMS-managed nav/footer/social/SEO defaults and Super-Admin-only officer management.

- [ ] **Step 1: Write role-boundary tests**

```ts
expect(can('ADMIN', 'MANAGE_USERS')).toBe(false)
expect(can('SUPER_ADMIN', 'MANAGE_USERS')).toBe(true)
```

E2E additionally verifies an ADMIN visiting `/admin/users` receives a 403-style access screen rather than hidden controls on an otherwise usable page.

- [ ] **Step 2: Implement navigation manager**

Supports label, destination, visible, sort order, and optional external target. Validate internal paths and block `javascript:`/unsafe URLs.

- [ ] **Step 3: Implement site settings**

Editable fields include contact email, social links, footer text, default OG image, default SEO title pattern, announcement defaults, and brand asset references. Raw CSS/HTML is not a setting.

- [ ] **Step 4: Implement managed redirect rules**

Create `redirect_rules` with `source_path`, `destination`, `status_code` constrained to `301|302|307|308`, `active`, and audit fields. Add a server-side redirect resolver for legacy paths before rendering public 404s. Super Admin can manage rules; ADMIN may view them but cannot edit them at launch. Seed redirects for any renamed legacy routes discovered during migration.

- [ ] **Step 5: Implement officer role management**

Only SUPER_ADMIN can invite/activate/deactivate admins, change roles/scopes, and grant Editor `can_publish`. The service rejects demoting/deactivating the final active SUPER_ADMIN.

- [ ] **Step 6: Implement audit page**

Filters by actor, action, entity type, and date; snapshots render as safe structured diffs, not raw unescaped HTML.

- [ ] **Step 7: Run and commit**

```bash
npm test -- tests/unit/system-admin.test.ts
npm run test:e2e -- tests/e2e/role-boundaries.spec.ts
git add 'app/admin/(portal)/navigation' 'app/admin/(portal)/settings' 'app/admin/(portal)/users' 'app/admin/(portal)/audit' 'app/(public)/[...legacy]' database/migrations/009_redirect_rules.sql lib/cms lib/auth tests
git commit -m "feat: add super admin system controls"
```

---

### Task 15: Complete responsive/accessibility behavior and visual QA against the approved alternate direction

**Files:**
- Modify: `app/globals.css`
- Modify: `components/public/PublicHeader.tsx`
- Modify: `components/public/PublicFooter.tsx`
- Modify: `components/public/CmsPage.tsx`
- Modify: `components/admin/AdminShell.tsx`
- Modify: `components/admin/AdminSidebar.tsx`
- Modify: `components/admin/DataTable.tsx`
- Modify: `components/page-builder/PageRenderer.tsx`
- Modify: `components/page-builder/admin/PageSectionList.tsx`
- Modify: `components/page-builder/admin/SectionEditor.tsx`
- Create: `tests/e2e/accessibility-navigation.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces finished responsive public/admin design system.

- [ ] **Step 1: Add reduced-motion and focus regression assertions**

Use Playwright to tab through public nav and admin drawer, asserting visible focus and operability without mouse input.

- [ ] **Step 2: Implement responsive breakpoints**

Required checks:

```text
390px phone
768px tablet
1280px desktop
1440px desktop
```

Public directories collapse filters cleanly. Admin tables switch to card rows where horizontal scrolling would make primary actions unusable. The page builder remains usable on tablet and exposes a “best on larger screen” note on narrow phones without blocking routine edits.

- [ ] **Step 3: Add semantic/accessibility passes**

Ensure one H1 per route, nested heading order, explicit form labels, accessible dialog names/descriptions, alt-text requirement for content images, and `prefers-reduced-motion` support.

- [ ] **Step 4: Run E2E suite and commit**

```bash
npm run test:e2e -- tests/e2e/accessibility-navigation.spec.ts tests/e2e/responsive.spec.ts
git add app/globals.css components tests/e2e
git commit -m "feat: finish responsive accessible OEC experience"
```

---

### Task 16: Build and verify legacy Astro/Supabase content migration

**Files:**
- Create: `scripts/migrate-legacy.ts`
- Create: `scripts/verify-migration.ts`
- Create: `docs/MIGRATION_RUNBOOK.md`
- Create: `tests/unit/legacy-mappers.test.ts`

**Interfaces:**
- Consumes legacy tables discovered in the existing site: `projects`, `project_updates`, `leaders`, `events`, `resources`, `opportunities`, `news_posts`, `sponsors`, `partner_schools`, `documents`, `submissions`, `media`, and `site_settings`.
- Produces new normalized OEC records, migration report, and reject list for stale/invalid rows requiring human review.

- [ ] **Step 1: Write mapper tests using representative legacy rows**

Example:

```ts
expect(mapLegacyProject({
  id: 'orb-map', slug: 'orb-map', title: 'Orb Map', status: 'Active', published: true,
  skills: ['TypeScript'], team_names: [], open_roles: []
})).toMatchObject({
  slug: 'orb-map',
  title: 'Orb Map',
  status: 'active'
})
```

Rows that claim `Active` without a lead/next step must be mapped to `scoping` or rejected for review rather than silently retaining the stronger status.

- [ ] **Step 2: Implement exact table mappers**

Map legacy names as follows:

```text
profiles → admin_profiles/role_assignments only after authenticated-user review
projects → projects
project_updates → project_updates
leaders → leaders
events → events
resources → resources
opportunities → opportunities
news_posts → news_posts
sponsors → sponsors
partner_schools → partner_schools
documents → documents
submissions → submissions
media → media
site_settings → selected site_settings values only
```

Do not migrate `competition_editions` or `impact` blindly; emit them in the review report because the new launch spec does not require those old public surfaces.

- [ ] **Step 3: Preserve legacy IDs in a mapping table/report, not primary keys**

Each migrated row stores `legacy_source_id` or is recorded in `migration_id_map.json` so redirects and troubleshooting can be traced.

- [ ] **Step 4: Implement verification**

`verify-migration.ts` compares accepted row counts, checks unique slugs, checks all referenced media exist, validates every publishable record with the new Zod schemas, and prints exact rejected IDs/reasons.

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "migrate:legacy": "tsx scripts/migrate-legacy.ts",
    "verify:migration": "tsx scripts/verify-migration.ts"
  }
}
```

Because these commands execute TypeScript directly, add `tsx` as a dev dependency in this task with `npm install -D tsx`.

- [ ] **Step 5: Run tests and dry-run migration**

```bash
npm test -- tests/unit/legacy-mappers.test.ts
LEGACY_SUPABASE_URL=... LEGACY_SUPABASE_SERVICE_ROLE_KEY=... NEW_SUPABASE_URL=... NEW_SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:legacy -- --dry-run
```

Expected: no database writes in dry-run; report includes accepted, transformed, and rejected records.

- [ ] **Step 6: Commit**

```bash
git add scripts docs/MIGRATION_RUNBOOK.md tests/unit/legacy-mappers.test.ts package.json
git commit -m "feat: add audited legacy content migration"
```

---

### Task 17: Add full regression, security, and publishing E2E coverage

**Files:**
- Create: `tests/e2e/draft-isolation.spec.ts`
- Create: `tests/e2e/version-restore.spec.ts`
- Create: `tests/e2e/media-failure.spec.ts`
- Create: `tests/e2e/public-forms.spec.ts`
- Create: `tests/e2e/public-navigation.spec.ts`
- Create: `tests/integration/rls-matrix.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces release gate `npm run verify:release`.

- [ ] **Step 1: Add exact draft-isolation scenario**

Create published headline `A`, save draft headline `B`, verify anonymous page still shows `A`, preview shows `B`, then publish and verify anonymous page shows `B`.

- [ ] **Step 2: Add version restore scenario**

Publish V1, publish V2, restore V1, assert the new published version number is 3 and historical V1/V2 rows remain unchanged.

- [ ] **Step 3: Add role/RLS matrix**

Cover anonymous, EDITOR without scope, EDITOR with scope, ADMIN, SUPER_ADMIN for read/write/publish/user-management paths.

- [ ] **Step 4: Add public route/link coverage**

Crawl internal links from Home, About, Projects, Events, Opportunities, Resources, Pathway, News, and Get Involved; fail on 404/500 responses.

- [ ] **Step 5: Add release script**

```json
{
  "scripts": {
    "verify:release": "npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e"
  }
}
```

- [ ] **Step 6: Run full verification and commit**

```bash
npm run verify:release
git add tests package.json package-lock.json
git commit -m "test: add OEC release regression suite"
```

---

### Task 18: Document deployment, environment setup, cutover, rollback, and admin operations

**Files:**
- Create: `.env.example`
- Create: `docs/ADMIN_OPERATIONS.md`
- Create: `docs/DEPLOYMENT.md`
- Create: `docs/CUTOVER_CHECKLIST.md`
- Modify: `README.md`

**Interfaces:**
- Produces the operational handoff needed to run the site without routine developer intervention.

- [ ] **Step 1: Add explicit environment contract**

`.env.example` lists names only, never values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUBMISSION_SALT=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 2: Write admin operating guide**

Document these exact workflows:

```text
edit page → save draft → preview → publish
restore a previous page version
edit/publish a project or event
upload/select media and maintain alt text
change navigation order
invite/change/deactivate an officer
review/archive a public submission
inspect audit history
```

- [ ] **Step 3: Write deployment and rollback guide**

Deployment sequence:

```text
create staging Supabase project
apply migrations
seed OEC pages/settings/brand metadata
configure Vercel preview env
run migration dry-run
run staging migration
run verify:release
manual acceptance on public + admin
export/backup production legacy data
configure production env
apply production migrations
migrate approved records
verify production RLS/auth
switch domain
monitor
```

Rollback sequence must preserve the old Astro deployment/domain target until the acceptance window closes, allowing DNS/Vercel domain reassignment back to the old deployment if launch-blocking issues occur.

- [ ] **Step 4: Execute the launch checklist in staging**

Verify:

```text
logos installed
OEC name consistent
all navigation and managed legacy redirects work
mobile breakpoints pass
RLS matrix passes
forms rate-limit and submit
SEO/OG/canonical/sitemap/robots present
favicon/badge present
Super Admin can operate content without code changes
backup/export exists
rollback target is known
```

- [ ] **Step 5: Run final verification**

Run:

```bash
npm run verify:release
git status --short
```

Expected: verification PASS and working tree clean after documentation commit.

- [ ] **Step 6: Commit**

```bash
git add .env.example README.md docs
git commit -m "docs: add OEC launch and admin operations runbook"
```

---

## Implementation Order and Review Gates

The approved spec covers several subsystems, but they share one database, publication model, and application shell. Keep them in this single ordered plan and use reviewer gates after each task. Do **not** parallelize tasks that alter the same database publication contract.

Safe parallel work only after prerequisites exist:

```text
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6
                                      ├→ Task 7
                                      ├→ Task 8 → Task 9 → Task 10
                                      └→ Task 11 → Task 12 → Task 13 → Task 14
Task 7-14 complete → Task 15 → Task 16 → Task 17 → Task 18
```

## Definition of Done

The platform is implementation-complete only when all of the following are true:

1. Public OEC pages render from published CMS/content state and do not read draft tables.
2. Super Admin can edit page content, reorder/hide/show approved sections, manage navigation/media/global settings, preview drafts, publish, and restore versions without code changes.
3. Admin and Editor permissions are enforced in server services and Supabase RLS.
4. Projects/events/opportunities/resources/news/leadership have dedicated admin managers and public experiences.
5. The dedicated 3-2 Pathway exists with official-source/advising framing.
6. Public involvement/project-interest forms work without member accounts and include server-side validation, spam defenses, and rate limiting.
7. Brand assets match the approved OEC badge/horizontal logos.
8. Draft isolation, publish atomicity, restore behavior, role boundaries, accessibility, responsive navigation, and public forms pass automated tests.
9. Legacy content migration produces an explicit accepted/transformed/rejected report and does not blindly migrate stale records.
10. `npm run verify:release` passes before production cutover.
