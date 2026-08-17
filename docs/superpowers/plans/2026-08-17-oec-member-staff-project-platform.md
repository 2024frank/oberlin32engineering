# OEC Member, Staff, and Project Team Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the completed OEC Next.js/CMS foundation with invite-only staff activation, approved `@oberlin.edu` member accounts, a private member directory, saves, project proposals/applications/invitations, project-team workspaces, review-gated public project updates, transactional email, and production-grade managed imagery.

**Architecture:** Keep Supabase Auth as the identity provider, but make application tables the source of truth for portal authorization. Staff and members use separate lifecycle registries; project leadership is project-scoped rather than a global role. All mutations run through server-side services/route handlers backed by RLS, and public project updates still pass through the existing CMS publication layer.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres/Auth/Storage, Resend, Zod, Vitest + Testing Library, Playwright, Vercel.

## Global Constraints

- Public brand is **Oberlin Engineering Club (OEC)**.
- Staff access is invite-only; only `SUPER_ADMIN` may invite, revoke, promote, demote, suspend, or re-role staff.
- `ADMIN` and `SUPER_ADMIN` may approve/reject verified Oberlin member applications.
- Member activation requires a verified **`@oberlin.edu`** address and explicit approval.
- Approved members may sign in with password or magic link.
- Member directory is private to active members and authorized staff; Oberlin email is private by default.
- Project Lead is a project-scoped role, never a global staff/member role.
- Approved project proposal flow is exactly **Member proposal → Admin/Super Admin review → Approved → workspace created → proposer becomes Project Lead**.
- Team entry supports both application and invitation; invitations target only active approved members and require explicit acceptance.
- Team-created public project updates are **draft → Admin/Super Admin review → publish** and may never bypass the CMS publishing gate.
- Draft/private member/team data must never appear in anonymous queries.
- Supabase service-role credentials and Resend API keys must never be exposed to browser bundles.
- Production imagery may be real, licensed, or generated, but generated imagery must pass realistic editorial-photo QA and be stored as managed Media Library assets.
- No arbitrary CSS, raw HTML, or freeform design-token editing is introduced by this work.
- Existing CMS/public site behavior from commits `22981e0` through `12f3dfd` must remain regression-safe.

---

## File Structure Map

```text
app/
  (public)/
    member-sign-in/page.tsx
    get-involved/page.tsx
    projects/[slug]/page.tsx
    opportunities/page.tsx
    resources/page.tsx
  admin/(portal)/
    member-applications/page.tsx
    members/page.tsx
    staff/page.tsx
    project-proposals/page.tsx
    project-applications/page.tsx
    project-updates/page.tsx
  member/
    layout.tsx
    (auth)/login/page.tsx
    (portal)/layout.tsx
    (portal)/page.tsx
    (portal)/profile/page.tsx
    (portal)/directory/page.tsx
    (portal)/saved/page.tsx
    (portal)/applications/page.tsx
    (portal)/teams/page.tsx
    (portal)/teams/[projectId]/page.tsx
    (portal)/invitations/page.tsx
    (portal)/proposals/page.tsx
    (portal)/notifications/page.tsx
  api/
    auth/staff/accept/route.ts
    auth/member/request/route.ts
    auth/member/magic-link/route.ts
    admin/staff/invites/route.ts
    admin/members/route.ts
    admin/project-proposals/route.ts
    member/profile/route.ts
    member/saves/route.ts
    member/project-proposals/route.ts
    member/project-applications/route.ts
    member/project-invitations/route.ts
    member/projects/[projectId]/route.ts
    member/projects/[projectId]/updates/route.ts
components/
  admin/members/
  admin/staff/
  admin/projects/
  member/
  media/
lib/
  auth/staffInvites.ts
  auth/memberSession.ts
  auth/memberLifecycle.ts
  email/client.ts
  email/templates.ts
  members/directory.ts
  members/profile.ts
  members/saves.ts
  projects/proposals.ts
  projects/applications.ts
  projects/teamInvites.ts
  projects/teamPermissions.ts
  projects/workspace.ts
  notifications/service.ts
  media/imagePolicy.ts
database/migrations/
  010_staff_invites.sql
  011_members.sql
  012_project_collaboration.sql
  013_member_staff_rls.sql
  014_media_provenance.sql
tests/
  unit/
  integration/
  rls/
  e2e/
```

---

### Task 1: Add staff invitation lifecycle and replace direct staff-account creation

**Files:**
- Create: `database/migrations/010_staff_invites.sql`
- Modify: `lib/auth/adminUsers.ts`
- Create: `lib/auth/staffInvites.ts`
- Create: `app/api/admin/staff/invites/route.ts`
- Create: `app/api/auth/staff/accept/route.ts`
- Modify: `app/admin/(portal)/users/page.tsx`
- Test: `tests/unit/staff-invites.test.ts`
- Test: `tests/integration/staff-invites.test.ts`

**Interfaces:**
- Consumes: `createSupabaseAdminClient()`, `CurrentAdmin`, existing `audit_log`.
- Produces: `createStaffInvite()`, `revokeStaffInvite()`, `acceptStaffInvite()`, `listStaffInvites()`, and database lifecycle `INVITED | ACTIVE | SUSPENDED | REVOKED`.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
import { assertStaffInviteTransition, normalizeStaffInviteRole } from '@/lib/auth/staffInvites'

it('allows only ADMIN or EDITOR to be invited', () => {
  expect(normalizeStaffInviteRole('ADMIN')).toBe('ADMIN')
  expect(normalizeStaffInviteRole('EDITOR')).toBe('EDITOR')
  expect(() => normalizeStaffInviteRole('SUPER_ADMIN')).toThrow('INVITE_ROLE_NOT_ALLOWED')
})

it('rejects expired and revoked invitations', () => {
  expect(() => assertStaffInviteTransition({ status: 'REVOKED', expiresAt: '2099-01-01T00:00:00Z' })).toThrow('STAFF_INVITE_REVOKED')
  expect(() => assertStaffInviteTransition({ status: 'INVITED', expiresAt: '2000-01-01T00:00:00Z' }, new Date('2026-08-17T06:00:00Z'))).toThrow('STAFF_INVITE_EXPIRED')
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/staff-invites.test.ts`

Expected: FAIL because `staffInvites.ts` does not exist.

- [ ] **Step 3: Add the staff invitation migration**

Create `staff_invite_status` and `staff_invites` with hashed single-use token storage:

```sql
do $$ begin
  create type public.staff_invite_status as enum ('INVITED','ACCEPTED','REVOKED','EXPIRED');
exception when duplicate_object then null; end $$;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  role public.admin_role not null check (role in ('ADMIN','EDITOR')),
  scopes text[] not null default '{}',
  can_publish boolean not null default false,
  token_hash text not null unique,
  status public.staff_invite_status not null default 'INVITED',
  expires_at timestamptz not null,
  invited_by uuid not null references public.admin_profiles(user_id),
  accepted_user_id uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists staff_invites_open_email_idx
  on public.staff_invites(lower(email)) where status='INVITED';

do $$ begin
  create type public.staff_account_status as enum ('ACTIVE','SUSPENDED','REVOKED');
exception when duplicate_object then null; end $$;

alter table public.admin_profiles
  add column if not exists status public.staff_account_status not null default 'ACTIVE';
```

- [ ] **Step 4: Implement invitation primitives**

```ts
export type StaffInviteRole = 'ADMIN' | 'EDITOR'
export type StaffInviteStatus = 'INVITED' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

export function normalizeStaffInviteRole(value: string): StaffInviteRole {
  if (value !== 'ADMIN' && value !== 'EDITOR') throw new Error('INVITE_ROLE_NOT_ALLOWED')
  return value
}

export function assertStaffInviteTransition(
  invite: { status: StaffInviteStatus; expiresAt: string },
  now = new Date()
) {
  if (invite.status === 'REVOKED') throw new Error('STAFF_INVITE_REVOKED')
  if (invite.status !== 'INVITED') throw new Error('STAFF_INVITE_USED')
  if (new Date(invite.expiresAt).getTime() <= now.getTime()) throw new Error('STAFF_INVITE_EXPIRED')
}
```

`createStaffInvite()` must generate `randomBytes(32).toString('base64url')`, store only a SHA-256 hash, expire after 72 hours, insert an audit event, and call `supabase.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })`. Send the generated Supabase action link through Resend with the application invite token embedded only in the redirect URL; never store either raw token in the database.

- [ ] **Step 5: Change staff management authorization**

Replace direct `supabase.auth.admin.inviteUserByEmail()` creation in `inviteAdminUser()` with `createStaffInvite()`. Keep `updateAdminUser()` Super-Admin-only at the route boundary. Do not allow the invite endpoint to create `SUPER_ADMIN` directly; promotion to Super Admin happens only from an existing active staff account after activation and must preserve the final-Super-Admin invariant.

- [ ] **Step 6: Add acceptance route and integration test**

`POST /api/auth/staff/accept` accepts `{ token }` only after Supabase has established an authenticated session from the invite action link. It hashes the application token, validates invite state, verifies `currentUser.email.toLowerCase() === invite.email.toLowerCase()`, then transactionally creates `admin_profiles` + `role_assignments`, marks the invite `ACCEPTED`, and audits `STAFF_INVITE_ACCEPTED`. A token without a matching authenticated email must return `STAFF_INVITE_IDENTITY_MISMATCH`.

Integration assertion:

```ts
expect(result.profile.active).toBe(true)
expect(result.assignment.role).toBe('EDITOR')
expect(result.invite.status).toBe('ACCEPTED')
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/unit/staff-invites.test.ts tests/integration/staff-invites.test.ts
npm run typecheck
```

Commit:

```bash
git add database/migrations/010_staff_invites.sql lib/auth/adminUsers.ts lib/auth/staffInvites.ts app/api/admin/staff/invites/route.ts app/api/auth/staff/accept/route.ts 'app/admin/(portal)/users/page.tsx' tests/unit/staff-invites.test.ts tests/integration/staff-invites.test.ts
git commit -m 'feat: add invite-only staff activation'
```

---

### Task 2: Add Oberlin membership requests, approval states, and member session gates

**Files:**
- Create: `database/migrations/011_members.sql`
- Create: `lib/auth/memberLifecycle.ts`
- Create: `lib/auth/memberSession.ts`
- Create: `app/api/auth/member/request/route.ts`
- Create: `app/api/auth/member/magic-link/route.ts`
- Create: `app/api/auth/member/activate/route.ts`
- Create: `app/api/admin/members/route.ts`
- Create: `app/member/(auth)/login/page.tsx`
- Create: `app/member/(portal)/layout.tsx`
- Test: `tests/unit/member-lifecycle.test.ts`
- Test: `tests/integration/member-approval.test.ts`

**Interfaces:**
- Produces: `isOberlinEmail()`, `requireActiveMember()`, `getCurrentMember()`, `submitMembershipRequest()`, `approveMembershipRequest()`, `rejectMembershipRequest()`.

- [ ] **Step 1: Write failing domain/lifecycle tests**

```ts
import { isOberlinEmail, assertMemberCanActivate } from '@/lib/auth/memberLifecycle'

it('accepts only exact oberlin.edu addresses', () => {
  expect(isOberlinEmail('student@oberlin.edu')).toBe(true)
  expect(isOberlinEmail('student@sub.oberlin.edu')).toBe(false)
  expect(isOberlinEmail('student@gmail.com')).toBe(false)
})

it('requires approval before portal activation', () => {
  expect(() => assertMemberCanActivate('PENDING_APPROVAL')).toThrow('MEMBER_NOT_APPROVED')
  expect(() => assertMemberCanActivate('REJECTED')).toThrow('MEMBER_NOT_APPROVED')
  expect(() => assertMemberCanActivate('APPROVED')).not.toThrow()
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/unit/member-lifecycle.test.ts`

Expected: FAIL because member lifecycle module is absent.

- [ ] **Step 3: Create member schema**

```sql
do $$ begin
  create type public.membership_status as enum ('REQUESTED','EMAIL_VERIFIED','PENDING_APPROVAL','APPROVED','REJECTED','ACTIVE','SUSPENDED');
exception when duplicate_object then null; end $$;

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  status public.membership_status not null default 'REQUESTED',
  auth_user_id uuid references auth.users(id),
  reviewed_by uuid references public.admin_profiles(user_id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists membership_requests_email_idx on public.membership_requests(lower(email));

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  membership_request_id uuid not null unique references public.membership_requests(id),
  oberlin_email text not null unique,
  display_name text not null,
  status public.membership_status not null default 'ACTIVE',
  class_year smallint,
  major text,
  disciplines text[] not null default '{}',
  skills text[] not null default '{}',
  project_interests text[] not null default '{}',
  availability text,
  portfolio_url text,
  github_url text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_privacy_settings (
  user_id uuid primary key references public.member_profiles(user_id) on delete cascade,
  directory_visible boolean not null default true,
  visible_fields text[] not null default array['display_name','class_year','major','disciplines','skills','project_interests','availability'],
  share_contact boolean not null default false,
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 4: Implement exact Oberlin-domain and state helpers**

```ts
export function isOberlinEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  return /^[^@\s]+@oberlin\.edu$/.test(normalized)
}

export function assertMemberCanActivate(status: string) {
  if (status !== 'APPROVED' && status !== 'ACTIVE') throw new Error('MEMBER_NOT_APPROVED')
}
```

- [ ] **Step 5: Implement request → verify → approval service**

`submitMembershipRequest()` must reject non-Oberlin domains before any member row is created. Email verification uses a Supabase email OTP/action link for the requested Oberlin address; the callback verifies the authenticated identity email matches the request, then moves `REQUESTED → EMAIL_VERIFIED → PENDING_APPROVAL`. `approveMembershipRequest()` is callable only by `ADMIN` or `SUPER_ADMIN`, creates/links `member_profiles` with status `APPROVED` plus `member_privacy_settings`, sets the request status `APPROVED`, records reviewer/audit data, and sends an activation email generated for the already-verified Supabase identity. `POST /api/auth/member/activate` requires the authenticated verified identity, changes both request/profile to `ACTIVE`, and may direct the member to set a password. Rejection sets `REJECTED`, stores optional review note, and sends a rejection email.

- [ ] **Step 6: Implement member route guard**

```ts
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('member_profiles').select('*').eq('user_id', user.id).eq('status', 'ACTIVE').maybeSingle()
  return data ? mapMember(data) : null
}

export async function requireActiveMember() {
  const member = await getCurrentMember()
  if (!member) redirect('/member/login')
  return member
}
```

- [ ] **Step 7: Add password + magic-link entry points**

The login page supports password sign-in plus a magic-link action. The server route refuses ordinary member-login magic links unless the address belongs to an `ACTIVE` member profile. The separate approval activation email may target `APPROVED` status and finishes activation before portal access is granted.

- [ ] **Step 8: Verify and commit**

Run:

```bash
npm test -- tests/unit/member-lifecycle.test.ts tests/integration/member-approval.test.ts
npm run typecheck
```

Commit with only Task 2 files.

---

### Task 3: Add member/staff/project RLS boundaries

**Files:**
- Create: `database/migrations/013_member_staff_rls.sql`
- Modify: `database/migrations/004_rls.sql` only if compatibility requires it
- Create: `tests/rls/member-staff-project-matrix.sql`
- Modify: `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces SQL helpers `private.is_active_member()`, `private.is_admin_or_super()`, `private.is_project_lead(project_id uuid)`.

- [ ] **Step 1: Write failing RLS matrix assertions**

Required matrix:

```text
anon: no member/staff/team private reads
pending member: no directory/workspace reads
active member: directory filtered reads + own profile/saves/applications
project lead: own project team/application/invite/milestone management only
editor: no member approvals and no staff invitation management
admin: member approvals, no staff invitation/role mutation
super admin: staff + member administration
```

- [ ] **Step 2: Add helper functions**

```sql
create or replace function private.is_active_member()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.member_profiles mp where mp.user_id=(select auth.uid()) and mp.status='ACTIVE');
$$;

create or replace function private.is_admin_or_super()
returns boolean language sql stable security definer set search_path='' as $$
  select private.current_role() in ('ADMIN'::public.admin_role,'SUPER_ADMIN'::public.admin_role);
$$;
```

`private.is_project_lead(p_project_id)` must check an ACTIVE `project_memberships` row whose role is `LEAD` for `auth.uid()`.

- [ ] **Step 3: Add policies**

Policies must enforce:
- only Super Admin manages `staff_invites`, `admin_profiles`, and `role_assignments` mutations;
- Admin/Super Admin reads and reviews `membership_requests`;
- active member can update only own `member_profiles` allowed profile fields and own privacy settings;
- directory reads go through a safe view/function that applies `visible_fields` and never exposes `oberlin_email` by default;
- project collaboration policies are project-scoped;
- member-generated project updates cannot update canonical publication state.

- [ ] **Step 4: Run Supabase/RLS tests**

Run:

```bash
supabase db reset
psql "$SUPABASE_DB_URL" -f tests/rls/member-staff-project-matrix.sql
```

Expected: all matrix assertions pass.

- [ ] **Step 5: Commit**

Commit migration, matrix, and permission tests.

---

### Task 4: Build member profile and privacy-controlled directory

**Files:**
- Create: `lib/members/profile.ts`
- Create: `lib/members/directory.ts`
- Create: `app/api/member/profile/route.ts`
- Create: `app/member/(portal)/profile/page.tsx`
- Create: `app/member/(portal)/directory/page.tsx`
- Create: `components/member/ProfileForm.tsx`
- Create: `components/member/DirectoryFilters.tsx`
- Create: `components/member/MemberCard.tsx`
- Test: `tests/unit/member-directory.test.ts`

**Interfaces:**
- Produces `sanitizeDirectoryMember()`, `searchMemberDirectory()`, `updateMemberProfile()`.

- [ ] **Step 1: Write failing privacy test**

```ts
it('hides fields excluded by the member privacy settings', () => {
  const result = sanitizeDirectoryMember(profile, { directoryVisible: true, visibleFields: ['display_name','skills'], shareContact: false })
  expect(result.displayName).toBe('Ada')
  expect(result.skills).toEqual(['CAD'])
  expect(result.major).toBeUndefined()
  expect(result.oberlinEmail).toBeUndefined()
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/unit/member-directory.test.ts`

- [ ] **Step 3: Implement privacy sanitizer and query contract**

Directory result type may expose only:

```ts
export type DirectoryMember = {
  userId: string
  displayName?: string
  classYear?: number
  major?: string
  disciplines?: string[]
  skills?: string[]
  projectInterests?: string[]
  availability?: string
  portfolioUrl?: string
  githubUrl?: string
  linkedinUrl?: string
  contactEmail?: string
}
```

`contactEmail` appears only when `share_contact=true`; otherwise no email field is returned.

- [ ] **Step 4: Build member profile and directory pages**

Profile page controls `directory_visible`, per-field checkboxes, and contact sharing. Directory filters support discipline, skill, major, class year, project interest, and availability. Only `requireActiveMember()` can reach either route.

- [ ] **Step 5: Verify and commit**

Run unit tests, typecheck, and the member-directory page smoke test; commit Task 4 files.

---

### Task 5: Add member saves/bookmarks for projects, opportunities, and resources

**Files:**
- Create: `lib/members/saves.ts`
- Create: `app/api/member/saves/route.ts`
- Create: `components/member/SaveButton.tsx`
- Create: `app/member/(portal)/saved/page.tsx`
- Modify: `app/(public)/projects/[slug]/page.tsx`
- Modify: `app/(public)/opportunities/page.tsx`
- Modify: `app/(public)/resources/page.tsx`
- Test: `tests/unit/member-saves.test.ts`

**Interfaces:**
- Produces `SavedItemType = 'PROJECT' | 'OPPORTUNITY' | 'RESOURCE'`, `toggleSavedItem()`, `listSavedItems()`.

- [ ] **Step 1: Write failing key/idempotency test**

```ts
it('builds one stable save key per member, type, and entity', () => {
  expect(savedItemKey('u1','PROJECT','p1')).toBe('u1:PROJECT:p1')
})
```

- [ ] **Step 2: Add table and unique constraint**

Add to member migration if not yet applied, otherwise create a follow-up migration:

```sql
create table if not exists public.saved_items (
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  item_type text not null check(item_type in ('PROJECT','OPPORTUNITY','RESOURCE')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id,item_type,item_id)
);
```

- [ ] **Step 3: Implement server mutation and UI**

Unauthenticated public users see `Sign in to save`; active members see `Save`/`Saved`. The API derives `user_id` from the session and never accepts it from the request body.

- [ ] **Step 4: Verify and commit**

Run `npm test -- tests/unit/member-saves.test.ts`, typecheck, and public/member route smoke tests; commit.

---

### Task 6: Add project proposal approval and automatic Project Lead workspace creation

**Files:**
- Create: `database/migrations/012_project_collaboration.sql`
- Create: `lib/projects/proposals.ts`
- Create: `app/api/member/project-proposals/route.ts`
- Create: `app/api/admin/project-proposals/route.ts`
- Create: `app/member/(portal)/proposals/page.tsx`
- Create: `app/admin/(portal)/project-proposals/page.tsx`
- Test: `tests/unit/project-proposals.test.ts`
- Test: `tests/integration/project-proposal-approval.test.ts`

**Interfaces:**
- Produces `submitProjectProposal()`, `reviewProjectProposal()`, `ProjectProposalStatus`.

- [ ] **Step 1: Write failing approval test**

```ts
it('creates one workspace and makes proposer the lead when approved', async () => {
  const result = await reviewProjectProposal({ proposalId: 'proposal-1', decision: 'APPROVE', reviewerId: 'admin-1' }, deps)
  expect(result.projectId).toBeTruthy()
  expect(result.membership).toMatchObject({ userId: 'member-1', role: 'LEAD', status: 'ACTIVE' })
})
```

- [ ] **Step 2: Add project collaboration schema**

Create `project_proposals`, `project_memberships`, `project_team_roles`, `project_milestones`, `project_applications`, `project_team_invites`, and `project_update_reviews` with enums/status checks. `project_proposals.approved_project_id` must be unique so a repeated approval cannot create two workspaces.

- [ ] **Step 3: Implement transactional approval**

Approval transaction must:
1. lock proposal;
2. verify `PENDING`;
3. create canonical project with non-public/internal state until publishing requirements are satisfied;
4. create membership `{ role: 'LEAD', status: 'ACTIVE' }` for proposer;
5. update proposal `APPROVED` + `approved_project_id`;
6. create audit + member notification;
7. queue/send approval email.

Rejection stores feedback and never creates a project.

- [ ] **Step 4: Build member/admin UIs**

Member proposal form requires title, problem, goal, disciplines, recruiting needs, and optional links. Admin queue shows proposer, submitted date, summary, and approve/reject with feedback.

- [ ] **Step 5: Verify and commit**

Run unit/integration tests plus typecheck; commit Task 6 files.

---

### Task 7: Add project applications and Project Lead team invitations

**Files:**
- Create: `lib/projects/applications.ts`
- Create: `lib/projects/teamInvites.ts`
- Create: `lib/projects/teamPermissions.ts`
- Create: `app/api/member/project-applications/route.ts`
- Create: `app/api/member/project-invitations/route.ts`
- Create: `app/member/(portal)/applications/page.tsx`
- Create: `app/member/(portal)/invitations/page.tsx`
- Create: `app/admin/(portal)/project-applications/page.tsx`
- Modify: `app/(public)/projects/[slug]/page.tsx`
- Test: `tests/unit/project-team-permissions.test.ts`
- Test: `tests/integration/project-team-lifecycle.test.ts`

**Interfaces:**
- Produces `applyToProject()`, `reviewProjectApplication()`, `inviteProjectMember()`, `respondToTeamInvite()`, `canManageProjectTeam()`.

- [ ] **Step 1: Write failing permission tests**

```ts
it('lets a lead manage only the project they lead', () => {
  expect(canManageProjectTeam({ memberId: 'm1', projectId: 'p1', leadProjectIds: ['p1'] })).toBe(true)
  expect(canManageProjectTeam({ memberId: 'm1', projectId: 'p2', leadProjectIds: ['p1'] })).toBe(false)
})

it('requires an approved active member for invitations', () => {
  expect(() => assertInvitableMember({ status: 'PENDING_APPROVAL' })).toThrow('MEMBER_NOT_INVITABLE')
})
```

- [ ] **Step 2: Verify RED and implement permission primitives**

`assertInvitableMember()` accepts only `ACTIVE`; `canManageProjectTeam()` is project-scoped.

- [ ] **Step 3: Implement application flow**

Active member submits one open application per project with short motivation/skills. Project Lead can `ACCEPT` or `REJECT`. Acceptance creates `project_memberships` exactly once and emits notification + email.

- [ ] **Step 4: Implement invitation flow**

Lead searches the private member directory, chooses an ACTIVE member, and creates an invitation. The target must explicitly accept; only acceptance creates membership. Decline/expiry creates no membership.

- [ ] **Step 5: Verify and commit**

Run team permission + lifecycle tests, typecheck, and commit.

---

### Task 8: Build the project-team workspace, milestones, roster, and review-gated updates

**Files:**
- Create: `lib/projects/workspace.ts`
- Create: `app/member/(portal)/teams/page.tsx`
- Create: `app/member/(portal)/teams/[projectId]/page.tsx`
- Create: `app/api/member/projects/[projectId]/route.ts`
- Create: `app/api/member/projects/[projectId]/updates/route.ts`
- Modify: `app/admin/(portal)/project-updates/page.tsx`
- Modify: `lib/cms/adminContent.ts`
- Test: `tests/unit/project-workspace.test.ts`
- Test: `tests/integration/project-update-review.test.ts`

**Interfaces:**
- Produces `getProjectWorkspace()`, `updateProjectMilestone()`, `submitTeamProjectUpdate()`, `reviewTeamProjectUpdate()`.

- [ ] **Step 1: Write failing publication-boundary test**

```ts
it('team submission is review-pending and cannot publish directly', async () => {
  const result = await submitTeamProjectUpdate(input, memberContext, deps)
  expect(result.reviewStatus).toBe('PENDING_REVIEW')
  expect(result.publicationState).not.toBe('published')
})
```

- [ ] **Step 2: Implement workspace read model**

Workspace response includes project summary, ACTIVE roster, team roles, milestones, pending applications, pending invitations, and draft updates. Non-team members get `PROJECT_WORKSPACE_FORBIDDEN`.

- [ ] **Step 3: Implement team mutations**

Project Lead may add/update milestones and team roles. Ordinary project members may create internal update drafts but cannot manage roster or publication.

- [ ] **Step 4: Connect update review to existing CMS**

Admin/Super Admin approval transforms the team draft into the existing `project_updates` CMS draft and then uses the established content publish service. Rejection records feedback; project team permissions never call canonical publish RPCs directly.

- [ ] **Step 5: Verify and commit**

Run workspace + review tests and typecheck; commit.

---

### Task 9: Add transactional email and in-app member notifications

**Files:**
- Create: `lib/email/client.ts`
- Create: `lib/email/templates.ts`
- Create: `lib/notifications/service.ts`
- Create: `app/member/(portal)/notifications/page.tsx`
- Test: `tests/unit/email-templates.test.ts`
- Test: `tests/unit/notifications.test.ts`

**Interfaces:**
- Produces `sendTransactionalEmail()`, template builders, `createMemberNotification()`, `markNotificationRead()`.

- [ ] **Step 1: Write failing template privacy test**

```ts
it('project invitation email contains action context but not private directory fields', () => {
  const message = projectInvitationEmail({ recipientName: 'Ada', projectTitle: 'Air Sensor', inviterName: 'Kwaku', actionUrl: 'https://example.test/member/invitations' })
  expect(message.text).toContain('Air Sensor')
  expect(message.text).not.toContain('@oberlin.edu')
})
```

- [ ] **Step 2: Implement Resend server client**

```ts
import { Resend } from 'resend'

export function createEmailClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY_MISSING')
  return new Resend(key)
}
```

No email module may be imported by a client component.

- [ ] **Step 3: Implement event templates**

Exact event set: staff invitation, member approved/rejected, magic link handoff where application email is used, project application accepted/rejected, team invitation, project proposal approved/rejected, project update review result.

- [ ] **Step 4: Implement notification storage/service**

`member_notifications` stores recipient, kind, title, body, action URL, read timestamp, and created timestamp. APIs derive recipient from server-side workflow state, never from arbitrary client IDs.

- [ ] **Step 5: Verify and commit**

Run email + notification unit tests and typecheck; commit.

---

### Task 10: Extend admin and member navigation/dashboard for the new workflows

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`
- Modify: `lib/cms/dashboard.ts`
- Modify: `app/admin/(portal)/page.tsx`
- Create: `components/admin/members/MemberApplicationQueue.tsx`
- Create: `components/admin/staff/StaffInviteManager.tsx`
- Create: `components/admin/projects/ProjectProposalQueue.tsx`
- Create: `components/member/MemberShell.tsx`
- Create: `components/member/MemberSidebar.tsx`
- Create: `app/member/(portal)/page.tsx`
- Test: `tests/unit/community-navigation.test.tsx`

**Interfaces:**
- Admin sidebar additions: Member Applications, Members, Staff/Roles/Invitations, Project Proposals, Project Applications.
- Member navigation: Dashboard, My Profile, Member Directory, Saved, My Applications, My Teams, Project Invitations, Project Proposals, Notifications.

- [ ] **Step 1: Write failing navigation test**

```tsx
it('shows the complete member portal navigation', () => {
  render(<MemberSidebar />)
  for (const label of ['Dashboard','My Profile','Member Directory','Saved','My Applications','My Teams','Project Invitations','Project Proposals','Notifications']) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
  }
})
```

- [ ] **Step 2: Implement navigation and dashboard counts**

Admin dashboard adds pending member approvals, active staff invitations, pending project proposals, and pending public project updates. Member dashboard adds saved counts, open applications, invitations, active teams, proposals, and unread notifications.

- [ ] **Step 3: Apply responsive/accessibility requirements**

All decision controls have text labels, focus-visible states, keyboard access, and status announcements through existing dialog/toast patterns. Member routes remain usable at narrow mobile widths.

- [ ] **Step 4: Verify and commit**

Run navigation/dashboard tests, typecheck, and accessibility smoke tests; commit.

---

### Task 11: Upgrade Media Library provenance and realistic-image QA metadata

**Files:**
- Create: `database/migrations/014_media_provenance.sql`
- Create: `lib/media/imagePolicy.ts`
- Modify: `lib/cms/media.ts`
- Modify: `components/admin/media/MediaLibrary.tsx`
- Modify: `components/admin/media/MediaPicker.tsx`
- Test: `tests/unit/image-policy.test.ts`

**Interfaces:**
- Produces `ImageSourceType = 'original' | 'licensed' | 'generated'`, `assertPublishableImageMetadata()`.

- [ ] **Step 1: Write failing generated-image metadata test**

```ts
it('requires visual QA approval before a generated image can be published', () => {
  expect(() => assertPublishableImageMetadata({ sourceType: 'generated', altText: 'Students prototyping a sensor', visualQaApproved: false })).toThrow('GENERATED_IMAGE_QA_REQUIRED')
})
```

- [ ] **Step 2: Add media provenance fields**

```sql
alter table public.media add column if not exists source_type text not null default 'original' check(source_type in ('original','licensed','generated'));
alter table public.media add column if not exists rights_note text;
alter table public.media add column if not exists focal_x numeric check(focal_x between 0 and 1);
alter table public.media add column if not exists focal_y numeric check(focal_y between 0 and 1);
alter table public.media add column if not exists visual_qa_approved boolean not null default false;
```

- [ ] **Step 3: Implement publishability policy**

All images require non-empty alt text. Licensed images require a rights note. Generated images require `visual_qa_approved=true` before selection in publishable page/content fields. This rule is enforced server-side, not only in the picker.

- [ ] **Step 4: Extend Media Library UI**

Expose source type, credit/rights, focal point, and generated-image QA status. Use descriptive helper copy: generated images are allowed only when visually reviewed for realistic hands, tools, text, lighting, reflections, proportions, and non-plastic textures.

- [ ] **Step 5: Import approved realistic engineering imagery as managed assets**

For each user-approved generated or sourced production image, place the file under `public/images/oec/`, seed a matching `media` row with `source_type`, alt text, caption/credit, rights note, focal point, and `visual_qa_approved`, and reference the Media Library record from seeded CMS content rather than hardcoding an external URL. Generated images that fail artifact review stay out of published seed content.

- [ ] **Step 6: Verify and commit**

Run image-policy tests + existing media integration tests + typecheck; commit.

---

### Task 12: Complete regression, RLS, E2E, migration, and deployment acceptance

**Files:**
- Modify: `tests/e2e/role-boundaries.spec.ts`
- Create: `tests/e2e/staff-invitation.spec.ts`
- Create: `tests/e2e/member-onboarding.spec.ts`
- Create: `tests/e2e/project-community-flow.spec.ts`
- Modify: `tests/e2e/accessibility-navigation.spec.ts`
- Modify: `tests/rls/role-matrix.sql`
- Modify: `scripts/migrate-legacy.ts`
- Modify: `scripts/verify-migration.ts`
- Modify: `docs/MIGRATION_RUNBOOK.md`
- Modify: `docs/ADMIN_OPERATIONS.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `vercel.json`

**Interfaces:**
- Produces launch-level acceptance evidence and a documented cutover path.

- [ ] **Step 1: Add critical staff E2E**

Scenario:

```text
SUPER_ADMIN invites EDITOR → invite email token fixture → invitee activates → EDITOR enters /admin → EDITOR cannot open staff management → SUPER_ADMIN can suspend EDITOR → suspended user loses /admin access
```

- [ ] **Step 2: Add critical member E2E**

Scenario:

```text
@oberlin.edu request → verify email fixture → ADMIN approves → activation → member signs in by password → member signs out → member signs in by magic link → member updates directory privacy → hidden fields do not appear to another member
```

- [ ] **Step 3: Add critical project E2E**

Scenario:

```text
member submits proposal → ADMIN approves → workspace exists → proposer is LEAD → second member applies → lead accepts → lead invites third active member → invitee accepts → team drafts update → public site does not show it → ADMIN publishes → public project page shows update
```

- [ ] **Step 4: Lock migration rule**

Legacy migration must never convert old form submissions into `member_profiles`, `membership_requests` with approved state, or staff access. Add verification assertion:

```ts
expect(migrationResult.autoApprovedMembers).toBe(0)
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Then run the Supabase RLS matrix against a reset local test database.

Expected: zero failing tests, zero TypeScript errors, successful production build, and no draft/private data leakage.

- [ ] **Step 6: Deployment acceptance**

Verify preview/staging environment has separate Supabase and Resend secrets; `/admin` and `/member` are `noindex`; staff/member emails point to the preview hostname; generated production images used by seeded pages have Media Library records and QA approval; production cutover happens only after staging acceptance.

- [ ] **Step 7: Commit**

```bash
git add tests scripts docs vercel.json
git commit -m 'test: verify OEC member and staff launch flows'
```

---

## Execution Order and Checkpoints

1. Tasks 1–3 establish authorization and database boundaries before any private UI is considered trustworthy.
2. Tasks 4–5 deliver member identity/profile/save value independently.
3. Tasks 6–8 deliver project-community workflows without weakening CMS publication controls.
4. Tasks 9–11 complete communication, operations UX, and production imagery governance.
5. Task 12 is the launch gate; migration/cutover is not allowed to precede it.

The unfinished legacy-migration work from the earlier platform plan resumes only after Tasks 1–11 of this plan are green, because old submissions must not accidentally become approved accounts under the new model.
