# Legacy Site Migration Runbook

## Purpose

Move valid public content from the previous Astro/Supabase site into the OEC Next.js schema without importing old identities as trusted staff or approved members.

## Hard safety invariants

- Legacy profiles are review-only and never become staff accounts automatically.
- Legacy submissions remain ordinary public submissions and never become membership requests.
- Migration targets cannot write `admin_profiles`, `role_assignments`, `staff_invites`, `membership_requests`, or `member_profiles` as an approval shortcut.
- Every migrated row needs a stable legacy source ID.
- Re-running the importer is idempotent through `legacy_source_id` conflict keys.
- The migration report must show `autoApprovedMembers: 0` and `autoApprovedStaff: 0`.

## Dry run

Set the legacy and new Supabase service credentials from `.env.example`, then run:

```bash
npm run migrate:legacy -- --dry-run
```

Review the generated report under `artifacts/migration/`. Items deliberately held for human review include old staff profiles, competition editions, impact records, unsafe/unknown site settings, and records that cannot be mapped confidently.

Active legacy projects without a documented lead and next step are downgraded to scoping rather than presented as healthy active projects.

## Import

After the dry-run report is approved, run the importer without `--dry-run`. Media is copied into the new `oec-media` bucket and referenced through explicit legacy-to-new ID maps.

Immediately run:

```bash
npm run verify:migration
```

Do not continue to cutover if reconciliation counts differ from the accepted report, if stable IDs are missing, or if either auto-approval counter is non-zero.

## Human review after import

Review migrated navigation, leadership, projects, events, opportunities, resources, news, documents, sponsors, partner schools, media metadata, and submissions in the new Admin portal. Confirm every image intended for publication satisfies the Media Library publication policy.

Create officers only through the first-Super-Admin bootstrap and subsequent Super Admin invitations. Create members only through the verified Oberlin membership flow.
