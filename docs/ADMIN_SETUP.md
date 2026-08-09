# Officer portal and backend setup

The officer portal is available at `/admin/`. It uses Supabase Auth for identity, Supabase Row Level Security for content access, the serverless API for officer invitations and public forms, and Resend for transactional email.

## 1. Create or choose the Supabase project

Record the project URL, anon or publishable key, and service-role key. Treat the service-role key as a server secret.

In **Authentication → URL Configuration**, add:

- `https://admin.oberlin32engineeringsociety.com`
- `https://admin.oberlin32engineeringsociety.com/`
- `https://www.oberlin32engineeringsociety.com/admin/`
- the local URL used for testing

Disable open public signups unless the society intentionally wants anyone to create an Auth account. Membership interest is handled by the public join form and does not require an Auth account.

## 2. Install the database

Open the Supabase SQL editor and run, in order:

1. `database/schema.sql`
2. `database/members.sql`
3. `database/migrations/2026-08-07-complete-site.sql`
4. `database/seed.sql`

The migration removes anonymous direct inserts from `submissions`. Public forms must go through `/api/submit`, where validation and rate limiting are enforced.

## 3. Create the storage bucket

Create a public bucket named `society-media`. The schema policies are written for that bucket. Use another name only after updating the matching storage policies and `SUPABASE_STORAGE_BUCKET` together.

The SQL schema contains the authenticated upload policies. Keep the public bucket limited to files that are safe for anyone to view. Do not upload private member records, identity documents, academic records, financial information, or medical information.

## 4. Create the first administrator

In **Authentication → Users**, create the first officer account with the email that will manage the portal. Copy the Auth user UUID.

Then run this SQL with the real values:

```sql
insert into public.profiles (id, email, full_name, role)
values (
  'AUTH-USER-UUID',
  'name@oberlin.edu',
  'Full Name',
  'admin'
)
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = 'admin',
  updated_at = now();
```

Sign in at `/admin/`. Once the first administrator is working, use **Officers and roles** in the portal to create roles and send one-time invitation codes to other officers. Sending a code does not grant portal access. The officer profile is assigned only after the recipient verifies a still-pending invitation.

## 5. Configure deployment secrets

Set these variables in the production deployment:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=society-media
NEXT_PUBLIC_ENABLE_PORTAL=false
NEXT_PUBLIC_USE_DATABASE=false
RESEND_API_KEY=
RESEND_FROM_EMAIL=Oberlin 3-2 Engineering Society <address@verified-domain.example>
CONTACT_EMAIL=fkusiapp@oberlin.edu
SUBMISSION_SALT=a-long-random-secret
```

The deployment build writes browser Supabase configuration only when `NEXT_PUBLIC_ENABLE_PORTAL=true`. Keep both public flags false during the first deployment so the redesigned site uses versioned JSON and the old database cannot override it. Public forms still work through the server API. After all four SQL files have been applied, Auth redirects are correct, and the first administrator is verified, enable the portal. Then set `NEXT_PUBLIC_USE_DATABASE=true` only after checking the seeded public records. Server secrets remain available only to API functions.

## 6. Configure Resend

Verify the sending domain in Resend and set `RESEND_FROM_EMAIL` to a verified address. Test delivery to an Oberlin address before inviting the full board.

Invitation and password-reset messages use typed one-time codes. The officer portal tries the Supabase `invite` and `recovery` verification types, then asks the officer to set a password. Accepting and revoking invitations are atomic after the August 2026 migration, so a code cannot restore access after an administrator revokes it.

## 7. Validate the installation

Run these checks locally and in CI:

```bash
python3 scripts/generate_seed.py
npm ci
npm test
```

Then test:

1. Public membership submission creates a `submissions` row.
2. A repeated burst of submissions receives HTTP 429.
3. An administrator can create a role and invite an officer.
4. The invited officer can enter the code, set a password, and sign in.
5. Revoking a pending invitation prevents it from creating an officer profile.
6. An editor can update public content but cannot invite officers.
7. A draft record does not appear on the public site.
8. An uploaded image appears in the media library and can be attached to a record.

## 8. Recovering access

On the officer login screen, choose **Use an invitation or reset code**, enter the account email, and request a reset code. The endpoint intentionally returns the same message whether or not the email exists.

If all administrator access is lost, create or locate the Auth user in Supabase and update the matching `profiles.role` to `admin` using the SQL editor.
