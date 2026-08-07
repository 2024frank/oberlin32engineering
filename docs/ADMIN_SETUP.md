# Administrator system setup

The public website works without a database. This setup is only needed to enable the secure `/admin/` command center, media library, and database-backed public submissions.

## 1. Create a Supabase project

Create a project owned by an account that can be transferred to future society leadership. Record the project URL and public publishable key. Do not use the service secret in the browser or GitHub Pages.

## 2. Create the database

In the Supabase SQL editor, run:

1. `database/schema.sql`
2. `database/seed.sql`

The schema creates content tables, authentication profiles, public-submission rules, storage policies, and row-level security.

## 3. Create the storage bucket

The schema attempts to configure the `society-media` public bucket. Confirm that it exists in Storage and that approved editors can upload while public visitors have read-only access.

## 4. Create the first administrator

Create a user in Supabase Authentication. Copy the user UUID, then run this in the SQL editor with the correct values:

```sql
insert into public.profiles (id, email, full_name, role)
values ('USER_UUID', 'name@oberlin.edu', 'Full Name', 'admin')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;
```

Use the `editor` role for people who may publish content but should not manage administrator access.

## 5. Add GitHub repository variables

In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET` with the value `society-media`

These are build-time public settings. Never add the database password or service secret.

## 6. Deploy and test

Run the GitHub Pages workflow or push to `main`. Then confirm:

- The public site still loads if Supabase is temporarily unavailable.
- `/admin/` rejects users who are not listed in `profiles`.
- An editor can create, update, and publish content.
- Public visitors can submit forms but cannot read submissions.
- Media uploads use approved file types and contain no private information.

## Leadership handoff

At the end of each term, transfer ownership, review administrator accounts, remove former access where appropriate, export essential records, and document who controls GitHub, the domain, Supabase, Instagram, and the membership form.
