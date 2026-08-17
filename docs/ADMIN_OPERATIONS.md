# OEC Admin and Community Operations

## Staff roles

### Super Admin

Super Admin controls officer invitations, staff roles/scopes, suspensions, navigation, global settings, redirects, audit history, and all content operations. Only Super Admin can invite, promote, demote, suspend, or revoke staff access. The system prevents removal of the final active Super Admin.

### Admin

Admin can manage and publish public content, review member requests, approve/reject project proposals, review team-authored updates, and oversee projects. Admin cannot create or modify staff accounts.

### Editor

Editor access is limited to explicitly assigned content scopes. Editor does not gain staff-management or member-approval rights from a UI route alone; server authorization and RLS enforce the same boundary.

## Officer onboarding

1. Super Admin opens staff controls and creates an invitation with role/scopes.
2. The officer receives an email link tied to the invited email identity.
3. The officer opens the link, presses **Continue securely** on the scanner-safe confirmation page, and chooses a password.
4. The server activates the officer only when the authenticated email matches the invitation and the invitation is valid, unused, unrevoked, and unexpired.
5. Super Admin can suspend/revoke the account later.

An uninvited Supabase identity is not an OEC staff account.

## Member lifecycle

1. Student requests an account with an exact `@oberlin.edu` address.
2. Student opens the verification email and presses **Continue securely** before the one-time token is consumed.
3. Request enters the Admin/Super Admin approval queue.
4. Approval emails an activation link to the same Oberlin address.
5. Student chooses a password and becomes `ACTIVE`.
6. Active members can sign in by password or magic link and can request password recovery to the approved Oberlin address.

Pending, rejected, approved-but-not-activated, suspended, or non-Oberlin identities cannot enter the member portal.

## Member privacy

The member directory is visible only to approved active members and authorized staff. Members control directory participation and field-level visibility. Oberlin email remains hidden by default. Hidden fields are also excluded from filters/search matching so private values cannot be inferred through search side channels.

## Projects and teams

- Members can save projects, opportunities, and resources.
- Members submit project proposals; Admin/Super Admin approval creates the workspace and makes the proposer Project Lead atomically.
- Approved members can apply to a recruiting project.
- Project Leads can accept/reject applications and invite other approved members.
- Invitations require acceptance by the invitee; Leads cannot silently add someone to the roster.
- Project workspaces contain roster, applications, invitations, milestones, and team updates.
- Team-authored updates are drafts. Admin/Super Admin must review them before they can enter the normal CMS publishing flow.

## Media and generated photography

Generated images are allowed only when they convincingly read as real professional photography. Before publication, Media Library records must contain the required alt text and provenance, plus rights information when the source requires it. Generated photography also requires a human realism review for hands, tools, text, lighting, reflections, proportions, textures, and other common synthetic artifacts.

The publication rule is enforced in the Media Library UI, server publishing services, and database publication triggers. Do not work around the rule with raw URLs or manual database edits.

## Password recovery

Member recovery mail is sent only when the exact requested address belongs to an `ACTIVE` member profile and is an Oberlin email. Officer recovery mail is sent only when the exact requested address belongs to an `ACTIVE` staff profile. The public recovery endpoints return a generic success response for unknown/ineligible identities to avoid account enumeration.

## Audit expectations

Role changes, bootstrap, invitation acceptance, membership decisions, project approvals, and publication actions should leave auditable records. Use soft-disable/suspension instead of deleting identity history where the schema supports it.


## Email-link safety

OEC custom authentication emails do not send users through a raw Supabase action redirect. They contain a token-hash URL on the OEC site. A GET opens `/auth/email-action` without consuming the token; an explicit POST from **Continue securely** verifies it through Supabase and creates the server cookie session. This prevents common mail-security prefetchers from spending the one-time token before the student or officer opens the message.
