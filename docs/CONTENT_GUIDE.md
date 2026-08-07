# Content guide

The website reads public content from `content/*.json`. These files also serve as the fallback when the optional database is unavailable.

## Global settings

Edit `content/site.json` for the membership form, Instagram account, contact email, advisor, announcement, founding term, and competition label.

## Collections

- `projects.json`: project briefs, skills, open roles, progress, and featured status
- `leaders.json`: current leaders, advisor, and open seats
- `events.json`: dates, locations, registration links, and featured events
- `opportunities.json`: leadership, project, internship, research, and collaboration listings
- `resources.json`: official and society-created resources
- `news.json`: field notes and announcements
- `competition.json`: current competition edition, tracks, stages, and judging framework
- `sponsors.json`: formally confirmed partners and supporters

## Publishing rules

- Every collection record needs a stable unique `id`.
- Keep `published` false until the item is ready for public display.
- Use `featured` only for the small number of records that should appear prominently.
- Leave dates blank and use an honest `date_label` when details are not confirmed.
- Do not claim funding, prizes, speakers, rooms, partnerships, or official approval before confirmation.
- Link to authoritative sources for formal academic requirements.
- Do not put private contact lists or form responses in these files.

## Build and validation

```bash
python scripts/build.py
python scripts/check_site.py
```
