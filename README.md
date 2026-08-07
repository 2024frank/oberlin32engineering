# Oberlin 3-2 Engineering Society website

This repository contains the public website, officer portal, versioned content, serverless API routes, and Supabase schema for the Oberlin 3-2 Engineering Society.

The public site is intentionally honest about the organization’s current stage. Proposed projects are labeled as proposals, planned events are not presented as confirmed dates, and the 3-2 guide points students to official sources rather than replacing academic advising.

## Architecture

- `src/pages/`: page bodies for the public website
- `src/partials/` and `src/templates/`: shared public layout
- `src/assets/`: public CSS, JavaScript, logos, and licensed photographs
- `src/admin/`: the officer portal
- `content/`: versioned fallback content and image-license records
- `api/`: serverless endpoints for public forms, officer invitations, and roles
- `database/`: Supabase schema, membership tables, migration, and generated seed data
- `scripts/`: build, seed-generation, and validation tools
- `site/`: generated deployment output; do not edit it by hand

The site uses plain HTML, CSS, JavaScript, Python build scripts, Supabase, and Resend. There is no package-install step and no frontend framework dependency.

## Local build

```bash
python3 scripts/generate_seed.py
python3 scripts/build.py
python3 scripts/check_site.py
node scripts/test_api.js
```

Serve the generated site locally:

```bash
python3 -m http.server 8080 --directory site
```

Then open `http://localhost:8080`.

## Environment variables

Public build configuration:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_STORAGE_BUCKET` (optional; keep `society-media` unless the storage policies are updated to match)
- `NEXT_PUBLIC_ENABLE_PORTAL=true` only after the database migration and Auth redirect settings are ready
- `NEXT_PUBLIC_USE_DATABASE=true` only after the migration and seed have been applied; this flag is ignored while the portal is disabled

Server-only configuration:

- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CONTACT_EMAIL` (optional)
- `SUBMISSION_SALT` (recommended random secret)

Never place a service-role key or Resend API key in a public runtime file.

## Database setup

Run these files in the Supabase SQL editor in this order:

1. `database/schema.sql`
2. `database/members.sql`
3. `database/migrations/2026-08-07-complete-site.sql`
4. `database/seed.sql`

See `docs/ADMIN_SETUP.md` for the first administrator, Auth settings, storage bucket, and deployment variables.

## Content rules

Every public record must use a status that matches reality:

- **Idea under review**: no project team or commitment exists yet.
- **Open for interest**: the society is collecting possible participants.
- **Scoping**: a lead and interested group are defining the work.
- **Active**: a real team, next task, and meeting rhythm exist.
- **Complete**: the stated scope was finished and documented.

Do not announce a date before a room and responsible organizer are confirmed. Do not call a conversation a partnership. Do not publish participation counts or impact claims without a record that supports them.

## Photographs and licenses

The versioned photographs currently used by the site are covered by the Unsplash License and are recorded in `content/photo_credits.json`. Keep that record whenever an image is added, replaced, or removed. For photographs of society activities, get permission before publishing identifiable people.

## Forms and privacy

Public forms submit to `/api/submit`. The endpoint validates allowed fields, enforces request-size limits, checks a honeypot and elapsed form time, and stores the submission through a server-only Supabase connection. After the migration is installed, persistent database rate limits use a one-way network-address hash. A compatibility path keeps validated forms working with the previous submissions table during deployment. The browser never receives the service-role key.

See `SECURITY.md` for reporting and operational guidance.
