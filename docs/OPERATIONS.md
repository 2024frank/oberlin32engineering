# Website Operations Handbook

This handbook defines how the society keeps the website accurate, safe, useful, and transferable between student leadership teams.

## Ownership

The Communications and Membership Chair should own routine publishing. The President remains accountable for organizational claims, and the Treasurer or relevant project lead should verify financial and project information before publication. At least two officers should retain repository administration access.

The repository, domain, Google Form, Instagram account, email accounts, Supabase project, and any analytics property should be owned by organization-controlled accounts wherever Oberlin policy permits. Do not make long-term operations depend on one student’s personal account.

## Content standards

Every public item should clearly fit one of these states:

- **Confirmed:** approved date, room, speaker, partner, amount, result, or policy.
- **Planned:** a program the society intends to run, with details still pending.
- **Open:** a role, project, submission, or opportunity currently accepting interest.
- **Archived:** a past item preserved for institutional memory.

Use exact dates after they are confirmed. Until then, use honest labels such as “Fall 2026 · Details coming soon.” Do not invent attendance, funding, awards, impact numbers, partnerships, or member outcomes.

Formal 3-2 requirements can change. Link to Oberlin and partner-school sources, add verification dates where useful, and avoid presenting peer guidance as official advising.

## Publishing cadence

Recommended routine:

- **Weekly during the semester:** review event dates, open roles, announcements, and deadlines.
- **Monthly:** review projects, opportunities, resource links, leadership records, and form destinations.
- **After each event:** add an accurate recap, attendance only when responsibly recorded, public photos with permission, and next steps.
- **At semester end:** archive completed events, document project status, publish lessons, and prepare the leadership handoff.
- **Annually:** update officers, advisor, founding-year report, competition archive, privacy language, and domain billing contacts.

## Update procedure

1. Edit the relevant file in `content/` for routine data updates.
2. Edit `src/pages/`, `src/partials/`, or `src/assets/` for structural and design changes.
3. Rebuild and validate.
4. Review the generated public pages.
5. Commit with a clear message and push.

```bash
python scripts/generate_seed.py
python scripts/build.py
python scripts/check_site.py
```

Never edit generated files in `site/` without making the matching source change.

## Privacy and consent

- Collect only information needed for membership or the stated submission purpose.
- Do not publish student phone numbers, private schedules, form responses, or non-public emails.
- Get permission before publishing identifiable photographs, biographies, project partner details, or student work.
- Remove access promptly when an officer leaves the role.
- Review public submissions before publishing them.
- Follow Oberlin requirements for student records, accessibility, conduct, purchasing, and organization communications.

## Security

- Use unique passwords and multi-factor authentication for every administrative account.
- Store recovery codes in an organization-approved secure location, not in the repository.
- Use the least-privileged GitHub and Supabase roles necessary.
- Never place access tokens, database passwords, service-role keys, or form exports in Git history.
- Revoke a credential immediately if it appears in chat, email, screenshots, shared notes, or source code.
- Review repository collaborators and third-party integrations each semester.

Report security concerns according to `SECURITY.md`.

## Accessibility and quality

Maintain:

- One clear page heading per public page.
- Alternative text for meaningful images.
- Keyboard access and visible focus states.
- Sufficient contrast and reduced-motion behavior.
- Plain language for calls to action and form instructions.
- Descriptive link text rather than unexplained “click here” labels.
- Responsive review at phone, tablet, and desktop widths.

Run `python scripts/check_site.py` before every release. It validates page structure, internal asset references, metadata, content files, JavaScript syntax, and critical deployment files.

## Leadership handoff

Before the outgoing board loses access, transfer and verify:

- GitHub repository ownership and administrator access.
- Domain registrar login, renewal date, and billing contact.
- GitHub Pages and DNS settings.
- Google Form ownership and response access.
- Instagram and email account access.
- Supabase project ownership and authorized users, when enabled.
- Current content calendar, known issues, open tasks, and pending confirmations.
- A clean local build and the latest successful production commit.

Use `src/assets/downloads/leadership-handoff-template.md` as the working checklist. The incoming board should test every login and complete one supervised website update before the transition is considered finished.
