# OEC Deployment Runbook

## Launch rule

Do not cut production traffic to the Next.js rewrite until migrations, build, RLS checks, and staging E2E acceptance all pass against the same release candidate. The old site remains the rollback target until production verification is complete.

## 1. Provision services

Use one Supabase project per environment, Vercel for the Next.js application, and Resend for transactional mail. Production and staging must not share service-role keys or test accounts.

OEC-generated invitation, verification, magic-link, activation, and recovery emails use Supabase token hashes and first land on `/auth/email-action`. That GET page does not consume the token; the user must press **Continue securely**, which POSTs to `/auth/confirm` so the server can establish the cookie session. This intentionally protects one-time links from email-security prefetch scanners. Keep the Supabase Site URL pointed at the correct environment; `/auth/callback` remains available for future code-based/OAuth flows.

## 2. Configure secrets

Copy `.env.example` and populate the environment-specific values. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, migration service keys, `CRON_SECRET`, or `SUBMISSION_SALT` through `NEXT_PUBLIC_*` variables.

Required production values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`
- `SUBMISSION_SALT`

## 3. Apply database migrations

Apply `database/migrations/001_core.sql` through `020_first_super_admin_bootstrap.sql` in numeric order to a clean staging database first. Do not skip the RLS or publication-policy migrations.

After applying migrations, run both RLS matrices against the isolated database:

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/rls/role-matrix.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/rls/member-staff-project-matrix.sql
```

The first-Super-Admin bootstrap RPC is executable by the service role only. Normal staff accounts remain invitation-only.

## 4. Create the first Super Admin once

Set:

```bash
BOOTSTRAP_SUPER_ADMIN_EMAIL=founder@example.edu
BOOTSTRAP_SUPER_ADMIN_DISPLAY_NAME="Founding Admin"
```

Then run:

```bash
npm run bootstrap:super-admin
```

The command refuses to run if an active Super Admin already exists. If the auth identity does not exist, it creates and confirms it, atomically grants the first `SUPER_ADMIN` role, writes an audit event, and emails a secure password-setup link. Every officer after that must be invited from the Super Admin staff controls.

Remove the bootstrap variables from the deployment environment after the first account is activated. Never use the bootstrap command as a normal officer-management tool.

## 5. Build and verify

From a clean install:

```bash
npm ci
npm run verify:release
```

`verify:release` runs lint, TypeScript, unit/integration tests, a production build, and Playwright. The staging E2E suite additionally requires the accounts and mailbox variables from `.env.example`.

The external E2E mailbox service must be staging-only. Its GET endpoint receives `recipient`, `kind`, and `after` query values plus the optional bearer token, and returns `{ "url": "..." }`. Do not add a production API route that exposes authentication links for tests.

## 6. Staging acceptance

Verify at minimum:

1. Super Admin can invite an Editor, and the Editor cannot open Super-Admin-only staff controls.
2. Suspended officers immediately lose portal authorization.
3. A non-`@oberlin.edu` member request is rejected.
4. A verified Oberlin member remains blocked until Admin/Super Admin approval and activation.
5. Member password login, magic-link login, password recovery, and sign-out work.
6. Private directory fields do not appear in search results or filters.
7. A member proposal requires Admin/Super Admin approval before a workspace exists.
8. Team applications and Lead invitations require explicit acceptance before roster membership.
9. Team-authored updates remain private until Admin/Super Admin review and CMS publication.
10. Generated photography cannot publish without alt text, provenance, rights where required, and human realism QA.
11. `/admin`, `/member`, the secure email-action page, activation, verification, and recovery surfaces return `X-Robots-Tag: noindex, nofollow`.
12. Email-link prefetching does not consume a token until the user presses **Continue securely**.

## 7. Production cutover

Deploy the exact staging-accepted commit. Apply the same migration set to production before directing traffic. Run smoke tests for public navigation, public project/event/opportunity/resource pages, officer login, member login, mail delivery, and a draft-preview-publish cycle.

## Rollback

If a release fails acceptance or production smoke testing:

1. Restore traffic to the last known-good deployment.
2. Do not roll database migrations backward destructively while user writes may exist.
3. Disable affected write paths if necessary.
4. Export any new production writes before a schema repair.
5. Fix forward with a new numbered migration and repeat staging acceptance.

Never restore legacy staff profiles as approved staff accounts and never convert legacy submissions into approved members during rollback or migration.
