# Content maintenance guide

This guide is for future officers who need to keep the website current without rebuilding it from scratch.

## Update an event

Edit `content/events.json`. Each event includes:

- `title`
- `eyebrow`
- `date`
- `time`
- `location`
- `description`
- `status`
- `kind`

Use honest status labels such as `Planning`, `Date coming soon`, `Registration open`, or `Confirmed`. Do not publish a date, room, speaker, or funding amount until it is confirmed.

## Update a project idea

Edit `content/projects.json`. Keep the description focused on the problem, the people who may benefit, and the engineering areas involved. Avoid promising that the club will fund or complete a project before approval.

## Update a resource

Edit `content/resources.json`. Prefer official college, partner-school, government, or professional-society sources. Check links each semester and remove anything outdated.

## Update global details

Edit `content/site.json` when the club changes its:

- Email address
- Instagram account
- Advisor
- Website domain
- Google Form
- Recognition status
- Launch term

## Publish changes

```bash
python scripts/build.py
python scripts/check_site.py
git add .
git commit -m "Update website content"
git push
```

A push to `main` starts the deployment workflow automatically.

## Handoff checklist

Before an officer leaves the organization:

- Transfer repository administration to the next authorized officer.
- Confirm that at least two current officers can manage the repository.
- Update the contact email and leadership details.
- Remove former officers' unnecessary access.
- Archive old events rather than presenting them as upcoming.
- Export important documents to an organization-owned shared drive.
- Never store member sign-up exports in this public repository.
