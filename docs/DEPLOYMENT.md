# Deployment

The Astro production build is generated from `app/`, `src/assets/`, and `content/` into `site/`. Browser behavior and the officer portal are strict TypeScript; existing Vercel API functions remain unchanged.

## Build command

```bash
npm ci
python3 scripts/generate_seed.py
npm run build
```

## Output directory

```text
site
```

## Validation

```bash
python3 scripts/generate_seed.py
npm test
```

The repository includes a GitHub Pages workflow for the static public build. The same generated `site/` directory can also be deployed through Vercel. API routes in `api/` require a serverless deployment such as Vercel; GitHub Pages alone cannot execute them. The production custom domain should point to the deployment that serves both the static output and the API routes.

## Required production variables

See `docs/ADMIN_SETUP.md`. The build may run without Supabase public variables, but the officer portal displays a setup state. Public forms require `SUPABASE_URL` and a server-side service key. Email notifications and officer codes also require Resend. Leave `NEXT_PUBLIC_ENABLE_PORTAL=false` and `NEXT_PUBLIC_USE_DATABASE=false` during the first safe cutover. In that state, the browser receives no Supabase public configuration, the public site uses versioned JSON, and forms still use the server endpoint. After the migration, seed, Auth redirects, and first administrator are verified, enable the portal. Turn on database-backed public content only after the seeded records have been checked.

## Domain behavior

The canonical public URL is `https://www.oberlin32engineeringsociety.com`. Configure the apex domain to redirect to the canonical host. Keep the admin host and any deployment preview hosts in the Supabase redirect allowlist only when needed.

## After deployment

Check the homepage, 3-2 guide, project filtering, resource search, all public forms, the 404 page, the officer login, a draft content record, and a published content record. Confirm that `/admin/` is excluded from indexing and that API responses do not expose server configuration.
