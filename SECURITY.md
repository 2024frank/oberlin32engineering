# Security policy

This repository must never contain access tokens, passwords, database passwords, private keys, service-level API keys, private form exports, or student contact lists.

## Reporting a problem

Report a security or privacy concern privately to the founding team through the contact method on the public website. Do not open a public issue containing credentials or personal information.

## Supported version

The current `main` branch is the supported version.

## Administrator system

The optional administrator interface uses Supabase authentication and row-level security. Only the public publishable key may be provided to the browser. Never commit or expose a Supabase service secret.
