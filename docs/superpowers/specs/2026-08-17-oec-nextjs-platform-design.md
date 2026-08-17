# Oberlin Engineering Club — Next.js Platform Design

Date: 2026-08-17
Status: Approved design, revised for staff invitations, approved Oberlin member accounts, project teams, and production media standards

## 1. Goal

Rebuild the current Oberlin 3-2 Engineering Society website as the **Oberlin Engineering Club (OEC)** using Next.js, React, TypeScript, Supabase, and Vercel.

The platform has three connected surfaces:

1. A polished public website for all Oberlin students interested in engineering.
2. An officer/admin portal that acts as a structured CMS so routine public-site changes do not require code changes.
3. A private approved-member portal for verified Oberlin students to save content, apply to projects, propose projects, form teams, and manage project collaboration.

The 3-2 pathway remains a dedicated top-level public section, but it is one resource inside the broader Engineering Club rather than the club's entire identity.

## 2. Brand and visual direction

Use the approved alternate UI direction and the user's supplied OEC logos.

- Primary website/header mark: horizontal squirrel + wordmark lockup.
- Compact mark: circular badge logo.
- Palette: cardinal/maroon, warm gold, charcoal, cream/off-white.
- Style: collegiate, modern engineering, clean, serious, student-led, not generic SaaS.
- Public, member, and admin surfaces share the same brand system but use layouts appropriate to each audience.

The design system protects typography, spacing, layout constraints, and color usage from arbitrary admin changes.

### Photography and image standards

Images are a core UX requirement. The site must feel professional and credible, not visibly AI-generated or like generic startup stock art.

Allowed sources:

- real Oberlin club/project photography
- real campus/lab/workshop photography used with permission
- licensed editorial-quality stock photography
- generated images only when they convincingly resemble real editorial photography and pass visual QA

Generated images are allowed, but they must avoid common synthetic artifacts such as plastic skin, malformed hands, impossible tools, fake circuitry, over-smoothed surfaces, inconsistent text, unrealistic reflections, or cinematic concept-art styling.

Preferred visual direction:

- believable student collaboration
- real-looking workbenches, tools, sensors, circuits, robotics, mechanical prototypes, CAD screens, lab notebooks, and fabrication spaces
- natural or warm practical lighting
- realistic texture and depth
- understated composition compatible with the OEC maroon/gold/cream/charcoal system

Generated or sourced images intended for production must be imported into the Media Library and treated as first-class site assets with:

- title
- alt text
- caption/credit
- source type (`original`, `licensed`, or `generated`)
- rights/permission note where applicable
- focal point/crop metadata
- tags
- usage tracking

No page component may depend on a chat attachment path or an untracked external image URL for core brand imagery.

## 3. Public information architecture

Top-level navigation:

- Home
- About
- Projects
- Events
- Opportunities
- Resources
- 3-2 Pathway
- News
- Get Involved
- Member Sign In

### Home

Contains configurable sections such as:

- Announcement banner
- Hero
- Mission / club purpose
- Featured project
- Upcoming events
- Current opportunities
- Engineering disciplines
- Latest news/update
- Get involved CTA

All normal content and section ordering are controlled from the admin CMS.

### Projects

Public project directory with filtering by discipline, status, skills, and recruiting state.

Project detail pages may include:

- problem statement
- goal
- status
- team
- disciplines
- timeline
- progress updates
- media
- documentation
- external/GitHub links
- application/join CTA for approved members
- public interest/signup CTA for visitors who are not members

Project status vocabulary must reflect reality and must not present unconfirmed work as established fact.

### Events

Upcoming and past events, including workshops, talks, build nights, panels, competitions, and other engineering activities.

Each published event requires confirmed date/time, responsible organizer, and location/access information.

### Opportunities

Filterable listings for:

- internships
- research
- fellowships
- competitions
- scholarships/funding
- campus opportunities

Includes deadline indicators, external application links, and member save/bookmark support.

### 3-2 Pathway

Dedicated top-level destination with:

- overview
- planning timeline
- prerequisites
- partner institutions
- FAQs
- official-source links
- student experiences later

The site must clearly direct students to official Oberlin and partner-school sources for academic decisions rather than positioning club content as authoritative advising.

### Resources

Engineering tools, labs/makerspaces, software, academic support, career resources, tutorials, funding, and project documentation. Approved members can save resources to their account.

### News

Announcements, club milestones, project updates, and event recaps.

### About

Mission, story, leadership, advisor, governance, and past leadership archive.

### Get Involved

Public users can submit forms for:

- membership request
- project interest
- project proposal interest
- leadership interest
- event volunteering
- partnership/collaboration inquiries

Member-only project proposals and project applications use authenticated workflows after account approval.

## 4. Authentication, account states, and roles

The application uses Supabase Auth for authentication, with application-level account registries and RLS enforcing whether a valid auth identity is actually authorized to use the staff or member portal.

### 4.1 Staff invitation model

Staff access is invite-only.

Only a **SUPER_ADMIN** may:

- invite Admins or Editors
- assign or change staff roles
- promote/demote staff
- suspend/reactivate staff
- remove staff access

Staff lifecycle:

**INVITED → ACTIVE → SUSPENDED/REVOKED**

Flow:

1. Super Admin enters the person's email.
2. Super Admin selects `ADMIN` or `EDITOR` and, for Editors, assigns allowed content scopes.
3. System creates a one-time invitation record and sends an email setup link.
4. Invitee verifies the invitation and creates credentials.
5. Account becomes ACTIVE only if the invitation is valid and has not expired/revoked.
6. An uninvited identity cannot enter the staff portal even if it has a Supabase Auth account.

Staff invitation email delivery uses a server-side transactional email integration, with Resend as the default provider. Supabase Auth links may be used for the credential/verification token, but the application database remains the source of truth for role and access status.

### 4.2 Staff roles

#### SUPER_ADMIN

- full access
- invite/remove/manage staff and roles
- manage site settings and navigation
- publish all content
- manage permissions
- destructive/system actions
- rollback/recovery controls
- approve/reject member applications

#### ADMIN

- manage public content and submissions broadly
- create/edit/publish allowed content
- approve/reject Oberlin member applications
- oversee projects and public project updates
- cannot invite, remove, promote, demote, or re-role staff
- cannot change Super Admin-only security settings

#### EDITOR

- manage assigned content areas
- create/edit drafts
- publishing only when explicitly permitted by scope
- no staff administration
- no member-approval authority unless the role model is deliberately expanded later

Authorization must be enforced server-side and through Supabase Row Level Security, not only through UI visibility.

### 4.3 Oberlin member account model

Member access is restricted to verified **`@oberlin.edu`** addresses and requires approval.

Member lifecycle:

**REQUESTED → EMAIL_VERIFIED → PENDING_APPROVAL → APPROVED/REJECTED → ACTIVE**

Flow:

1. Student submits membership request using an `@oberlin.edu` email address.
2. Server rejects non-Oberlin domains before account activation.
3. Student verifies control of the Oberlin address.
4. Request enters the Admin/Super Admin approval queue.
5. Admin or Super Admin approves or rejects the request.
6. Approved student receives an activation email.
7. Student can set a password and/or use magic-link sign-in.
8. Only APPROVED/ACTIVE members can use the member portal.

A pending, rejected, suspended, or unknown identity may authenticate at the provider level if necessary for verification, but the application must not issue access to member routes or member data. The user-facing result is no member-portal login/access until approval.

### 4.4 Member sign-in

Approved members support both:

- email + password
- passwordless magic link

Password reset and magic-link delivery must go only to the verified Oberlin email attached to the approved member profile.

### 4.5 Member and project roles

#### MEMBER

- manage personal profile/privacy settings
- browse private member directory
- save projects, opportunities, and resources
- apply to join recruiting projects
- view application status
- accept/reject project invitations
- submit project proposals
- participate in approved project workspaces

#### PROJECT_LEAD

A project-scoped role, not a global site role.

- all MEMBER capabilities
- manage the approved project workspace
- review project applications
- invite approved Oberlin members
- assign project-team roles
- remove team members when appropriate
- manage milestones/workspace information
- create project updates for review
- manage project media/files within project permissions

Project Lead permissions apply only to projects where that member holds the lead role.

## 5. Member portal and directory

Member portal navigation:

- Dashboard
- My Profile
- Member Directory
- Saved Projects
- Saved Opportunities
- Saved Resources
- My Applications
- My Teams
- Project Invitations
- Project Proposals
- Notifications

### Member directory

The member directory is private to approved members and authorized staff.

Members may opt out of the directory entirely and configure per-field visibility.

Potential directory fields:

- name
- class year
- major
- engineering disciplines/interests
- skills
- project interests
- availability for projects
- portfolio URL
- GitHub
- LinkedIn

Oberlin email is private by default and is not displayed unless the member explicitly chooses an allowed contact-sharing option.

Directory search/filtering supports useful team formation dimensions such as discipline, skill, major, class year, project interest, and availability.

## 6. Project proposal, application, and team workflow

### 6.1 Starting a project

Approved members may propose a project.

Flow:

**Member proposal → Admin/Super Admin review → Approved → project workspace created → proposer becomes Project Lead**

Rejected proposals remain visible to the proposer with status and optional review feedback, but do not create a public project or team workspace.

### 6.2 Joining a project

Two supported paths:

1. **Application:** approved member applies to a recruiting project; Project Lead reviews and accepts/rejects.
2. **Invitation:** Project Lead invites another approved Oberlin member; invitee must explicitly accept before membership is created.

Project Leads cannot invite unapproved/non-Oberlin accounts into the member workspace.

### 6.3 Project-team workspace

An approved team workspace can include:

- team roster
- team roles
- project milestones
- internal notes/status fields intended for collaboration
- project files/media
- draft project updates
- application queue
- invitation queue

Public publication remains separate from internal team collaboration.

### 6.4 Public project updates

Team members/Project Leads can prepare updates, but public updates follow:

**Team draft → Admin/Super Admin review → Publish**

Project-team permissions never bypass the CMS publishing gate.

## 7. CMS and structured page builder

The admin portal functions as a lightweight structured CMS.

Normal website updates must not require React/TypeScript edits or a redeploy.

Super Admin can:

- edit text, buttons, links, images, and metadata
- reorder page sections
- hide/show page sections
- choose from approved section layouts
- select featured records
- manage navigation labels/order
- edit global footer/contact/social content
- schedule publication later
- preview drafts
- publish
- restore older versions

The page builder is **structured**, not freeform. It must not permit arbitrary CSS, unrestricted colors/fonts, raw HTML injection, or unconstrained drag-anything-anywhere editing.

### Reusable block types

Examples:

- image hero
- split hero
- minimal hero
- text + image
- statistics
- features/icon grid
- rich text
- quote
- gallery
- project grid
- project spotlight
- discipline grid
- project timeline
- leadership grid
- event list
- opportunity list
- news grid
- sponsors/collaborators
- join/project/newsletter/contact/custom CTA

Every block has a typed schema and publish validation.

## 8. Publishing workflow

Required workflow:

**Edit → Save Draft → Preview → Publish**

Rules:

- Drafts never appear on public queries.
- Preview renders the exact same production components as the published page.
- Publishing creates an immutable version/revision record.
- Super Admin can restore a previous version.
- Publish operations must be transactional.
- Validation blocks publishing when required data is missing.
- Scheduled publishing is supported.
- Member-created public project updates always require Admin/Super Admin review before publication.

## 9. Admin portal information architecture

Main sections:

- Dashboard
- Public Submissions
- Member Applications
- Members / Directory Administration
- Staff / Roles / Invitations
- Website / Pages
- Projects
- Project Proposals
- Project Applications
- Project Updates
- Events
- Opportunities
- News
- Leadership
- Resources
- Documents
- Sponsors / Collaborators
- Media Library
- Navigation
- Site Settings
- Audit Log / Change History

### Dashboard

Useful operational information rather than vanity metrics:

- new public submissions
- pending member approvals
- active staff invitations
- drafts awaiting publication
- pending project proposals
- pending public project updates
- upcoming events
- active projects
- opportunities nearing deadline
- recent changes
- recent staff actions
- scheduled publications
- quick-create actions

### Content managers

Structured records such as projects, events, opportunities, resources, leaders, and news use dedicated management interfaces rather than being edited as arbitrary page-builder JSON.

### Website editor

Website → Pages → [Page]

Shows ordered page sections with controls for:

- drag/reorder
- visible/hidden
- edit
- duplicate where appropriate
- remove
- add approved section

Each section editor provides content fields plus a constrained layout selector.

## 10. Technical architecture

### Application

One Next.js App Router application:

```text
app/
  (public)/
  admin/
  member/
  preview/
  api/
components/
  public/
  admin/
  member/
  page-builder/
  ui/
lib/
  supabase/
  auth/
  permissions/
  email/
  publishing/
  validation/
  media/
database/
  migrations/
  policies/
  seed/
```

### Core stack

- Next.js App Router
- React
- TypeScript
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Resend for transactional application emails
- Vercel

Prefer React Server Components for public read paths and use client components only where interactivity requires them.

### Data model

CMS/platform tables:

- pages
- page_sections
- page_versions
- section_versions or versioned section payloads
- media
- media_usage
- navigation_items
- site_settings
- scheduled_publications
- audit_log
- redirects

Staff/auth tables:

- staff_profiles
- staff_invites
- staff_scope_assignments

Member tables:

- membership_requests
- member_profiles
- member_privacy_settings
- member_notifications
- saved_items

Project collaboration tables:

- projects
- project_proposals
- project_memberships
- project_applications
- project_team_invites
- project_team_roles
- project_updates
- project_update_reviews
- project_milestones

Other structured content tables:

- events
- opportunities
- resources
- news_posts
- leaders
- sponsors
- documents
- submissions

Supporting tables may include tags, relationships, moderation/review metadata, media usage, and publication/version metadata.

Avoid one database row per sentence. Use structured blocks for page composition and normalized tables for searchable/filterable entities.

## 11. Media library

Supabase Storage-backed media system with:

- upload
- file validation
- alt text
- caption/credit
- source type
- permission/rights note
- tags
- dimensions/type metadata
- focal point/crop metadata
- replacement where safe
- usage tracking
- existing-asset selection
- duplicate avoidance where practical

Official OEC logos are seeded as protected brand assets.

Generated production imagery is also saved as managed Media Library assets rather than embedded ad hoc. Generated assets must be visually reviewed before public use.

## 12. Email and notifications

Transactional email events include:

- staff invitation
- staff invitation reminder/revocation notice where needed
- membership email verification
- membership approved
- membership rejected
- password reset
- magic link
- project application accepted/rejected
- project team invitation
- project proposal approved/rejected
- optional public-update review result

Emails must not disclose private member-directory data beyond what is required for the action.

The application also supports in-app member notifications for project invitations, application outcomes, proposal outcomes, and team-related actions.

## 13. Security and reliability

- Supabase RLS for all private/admin/member-managed data.
- Server-side authorization on mutations.
- Service-role credentials never exposed to the browser.
- Public forms validated server-side.
- Membership domain validation enforced server-side; client checks are only convenience.
- Staff invitation status/role checked server-side before staff portal access.
- Member approval/status checked server-side before member portal access.
- Admins cannot modify staff roles or staff invitations.
- Only Super Admin can manage staff access.
- Last active Super Admin cannot be removed/demoted if doing so would leave no active Super Admin.
- Project Leads receive project-scoped permissions only.
- Project invitations can target only approved members.
- Rate limiting and spam protection for public submissions and membership requests.
- Destructive actions require confirmation.
- Soft deletion where recovery is useful.
- Audit log for publishes, staff-role changes, member approvals, deletes/restores, project approvals, and critical settings.
- Draft leakage tests.
- Transactional publish operations.
- Failed media operations must not destroy drafts.
- Expired/revoked invitation tokens cannot be reused.

## 14. Public content integrity

Preserve the useful rule from the existing platform: published content should accurately represent the organization's current reality.

Examples:

- proposals must not be labeled active projects before approval and a real team/process exists
- tentative events must not be presented as confirmed
- conversations must not be described as partnerships without confirmation
- impact/participation claims require a supporting record
- 3-2 guidance points to official sources
- internal member/team drafts must never be mistaken for published club statements

## 15. Responsive and accessibility requirements

Public website, member portal, and admin portal must support desktop, tablet, and mobile.

Requirements include:

- semantic heading structure
- keyboard access
- visible focus states
- properly associated labels
- accessible dialogs
- adequate contrast
- reduced-motion support
- descriptive alt text workflow
- responsive tables/cards
- accessible status/error messages
- accessible invitation/application decision controls

Complex page-building is optimized for desktop/tablet, but routine admin and member actions remain usable on mobile.

## 16. SEO and public web requirements

- per-page SEO title/description editable from CMS
- Open Graph metadata
- social share images
- canonical URLs
- sitemap
- robots configuration
- redirects from important legacy URLs
- structured data where appropriate
- fast public page delivery and optimized images

Private admin/member pages must not be indexed.

## 17. Testing strategy

### Unit

- role/permission evaluation
- staff invitation state transitions
- member approval state transitions
- Oberlin email-domain validation
- section schemas
- publish validation
- status rules
- project team permission rules
- save/bookmark helpers

### Database/RLS

Test anonymous, pending member, active member, Project Lead, Editor, Admin, and Super Admin access boundaries.

Required RLS cases include:

- uninvited users cannot access staff data
- Admin cannot modify staff roles/invitations
- pending/rejected member cannot access member directory/private member data
- active member can read only allowed directory fields
- Project Lead can manage only own project team/workspace
- member cannot publish public project update directly
- anonymous visitor cannot read drafts/member data

### Integration

- Supabase reads/writes
- staff invite creation/acceptance/revocation
- membership request/verification/approval
- password and magic-link member auth
- content CRUD
- media upload
- revision restore
- public form submission
- member saves/bookmarks
- project proposal approval and workspace creation
- project application/invitation lifecycle
- scheduled publication
- transactional email dispatch

### End-to-end

Critical staff flow:

**Super Admin invites staff → invitee activates → authorized staff sign-in → edit page → save draft → preview → publish → verify public page**

Critical member flow:

**Oberlin signup → verify email → Admin approval → activation → sign in → save project → apply to project → Project Lead accepts → member sees team workspace**

Critical project creation flow:

**approved member submits proposal → Admin approves → project workspace created → proposer becomes Project Lead → Lead invites member → member accepts → team drafts update → Admin publishes**

Also test:

- Editor cannot perform Super Admin actions
- Admin cannot invite or re-role staff
- non-Oberlin membership request is rejected
- pending member cannot enter member portal
- drafts never appear publicly
- rollback restores previous published content
- failed upload does not destroy edits
- responsive public/admin/member navigation

### Quality

- accessibility checks
- responsive checks
- performance budget
- no broken internal links
- no invalid publishable records
- visual QA for seeded/generated production imagery

## 18. Migration strategy

The current Astro/Supabase production site remains available while the rewrite is built.

Migration stages:

1. Audit current schema and content.
2. Define new migrations and compatibility mapping.
3. Transform valid content into the new schema.
4. Preserve useful projects, leadership, resources, events, submissions, media, and source/reference data.
5. Rename/reframe public identity to Oberlin Engineering Club.
6. Keep 3-2 content as a dedicated resource section.
7. Validate migrated records and media.
8. Do not auto-convert old public submissions into approved member accounts.
9. Run new site in staging.
10. Verify staff invitation, member approval, project-team permissions, and publishing workflow.
11. Switch production only after acceptance and automated checks pass.

Do not migrate stale or inaccurate content merely because it exists in the old database.

## 19. Environments and deployment

Three environments:

- local development
- preview/staging
- production

Each GitHub pull request should receive a Vercel preview deployment once repository write/deploy integration is available.

Production deployment happens only after tests pass.

Target public deployment is the OEC domain on Vercel, with staff under `/admin` and approved members under `/member`. A separate admin subdomain can be added later if useful.

Supabase environment configuration and Resend credentials must be environment-specific; production secrets are never copied into preview client bundles.

## 20. Launch criteria

Before cutover:

- approved OEC logos and branding installed
- professional production imagery loaded into Media Library
- generated production imagery visually reviewed for realism/artifacts
- new name used consistently
- all key mobile breakpoints tested
- public URLs/redirects checked
- RLS audited across anonymous/member/project/staff roles
- staff invitation emails tested
- staff role restrictions tested
- Oberlin member verification and approval tested
- password + magic-link member sign-in tested
- member directory privacy tested
- project proposal/application/invitation flows tested
- public project-update review tested
- public forms protected and tested
- transactional emails tested
- SEO metadata populated
- sitemap/robots complete
- social previews complete
- favicon/badge assets installed
- analytics configured if selected
- production backup/export taken
- rollback path verified
- Super Admin can operate routine public content without code changes

## 21. Deferred scope

Not required for launch:

- open registration for non-Oberlin members
- public social feed or direct messaging/chat
- arbitrary freeform page design
- ecommerce/merch checkout
- native mobile app
- real-time collaborative document editing

Approved Oberlin member accounts, private member directory, saves/bookmarks, project applications, proposals, team invitations, and project workspaces are **launch scope**.

## 22. Success criteria

The rewrite succeeds when:

1. OEC has a cohesive, responsive public website matching the approved alternate visual direction.
2. Production imagery is professional, believable, and managed as reusable Media Library assets.
3. Officers can manage structured content without code edits.
4. Super Admin can modify page content, ordering, navigation, media, global site settings, and staff access from the portal.
5. Only Super Admin can invite or change staff roles; uninvited/revoked staff cannot access the admin portal.
6. Admin and Super Admin can approve verified `@oberlin.edu` membership requests.
7. Approved members can sign in with password or magic link and control directory privacy.
8. Approved members can save projects, opportunities, and resources; apply to projects; submit project proposals; and manage their own participation state.
9. Approved project proposals create a project workspace and make the proposer Project Lead.
10. Project Leads can review applications and invite approved Oberlin members; invitees must accept before joining.
11. Member/team-created public project updates require Admin/Super Admin review before publication.
12. Drafts can be previewed before publication and versions can be restored.
13. Public users can discover projects, events, opportunities, resources, 3-2 information, and involvement options without creating an account.
14. Permissions are enforced at the server/database layers.
15. Existing valid content can be migrated safely without turning old submissions into automatically approved accounts.
16. The platform can be deployed on Vercel with Supabase as its database/auth/storage backend and Resend for application transactional email.
