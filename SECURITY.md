# Security policy

Report a suspected security problem privately to `fkusiapp@oberlin.edu`. Do not open a public issue containing credentials, personal data, reset codes, database records, or a working exploit.

Include the affected URL or file, what you observed, the minimum steps needed to reproduce it, and whether any personal information may have been exposed.

## Secrets

Never commit Supabase service-role keys, Resend API keys, database passwords, session tokens, one-time codes, or private exports. Public Supabase anon keys may be included in the generated runtime configuration; service-role keys may not.

## Public forms

Public forms must go through `/api/submit`. Do not restore direct anonymous table inserts. The endpoint enforces field allowlists, payload limits, origin checks, bot traps, hashed network-rate limits, and generic error responses.

## Officer access

Officer identity is handled by Supabase Auth. Invitations and password recovery use one-time codes. A sent invitation does not grant an officer role; the server assigns the profile only when the authenticated recipient accepts a still-pending invitation. Acceptance and revocation use row-locked database functions after migration. Only administrators may invite officers or manage role definitions. Editors may maintain public content through Row Level Security policies.

Review access at least once each term. Revoke accounts and deactivate roles that are no longer needed.

## Supported version

Security fixes are applied to the current `main` branch and production deployment.
