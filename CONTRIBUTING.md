# Contributing

Use a focused branch and keep public claims factual. Before proposing a change:

```bash
python3 scripts/generate_seed.py
npm ci
npm test
```

For content changes, follow `docs/CONTENT_GUIDE.md`. Proposed projects, planned events, open leadership roles, and confirmed outcomes must remain distinct.

For images, add or update the matching record in `content/photo_credits.json`. Do not add an image from a search result without checking the original source and license.

For database changes, add an idempotent migration. Do not weaken Row Level Security or expose service credentials to browser code.

Pull requests should explain what changed, why it is accurate, what was tested, and whether a deployment or database migration is required.
