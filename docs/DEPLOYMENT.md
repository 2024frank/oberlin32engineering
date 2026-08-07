# Deployment Runbook

This site is built as a static release and deployed from the `main` branch through GitHub Pages. The deployable output is the generated `site/` directory. Do not hand-edit files inside `site/`; make changes in `src/` or `content/`, then rebuild.

## Release flow

1. Update templates, assets, or JSON content.
2. Generate the optional Supabase seed when content records changed.
3. Build the static release.
4. Run all release checks.
5. Review the diff and confirm that no private information or credentials are present.
6. Commit and push to `main`.
7. Confirm the GitHub Pages workflow completed successfully.
8. Check the custom domain on desktop and mobile.

```bash
python scripts/generate_seed.py
python scripts/build.py
python scripts/check_site.py
git status
git diff --check
git add -A
git commit -m "Describe the website update"
git push
```

## GitHub Pages configuration

The repository workflow at `.github/workflows/deploy-pages.yml` builds, validates, uploads, and deploys the `site/` directory. In the repository settings:

- Set **Pages → Build and deployment → Source** to **GitHub Actions**.
- Keep the custom domain set to `oberlin32engineeringsociety.com`.
- Enable HTTPS after GitHub confirms the DNS records.
- Restrict direct changes to `main` when the leadership team grows.

The generated `site/CNAME` file must contain exactly:

```text
oberlin32engineeringsociety.com
```

See `docs/DOMAIN_SETUP.md` for the registrar records.

## Optional Supabase configuration

The public website works entirely from versioned JSON without Supabase. To enable the command center and database-backed submissions, add repository **Variables**, not secrets embedded in source:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

The publishable key is intended for browser use when row-level security is configured correctly. Never publish a service-role key, database password, recovery code, or personal access token.

## Release verification

After deployment, verify:

- Home, pathway, projects, events, resources, join, and contact pages load.
- Navigation and mobile menu work.
- The membership form opens at the correct Google Form.
- External links open safely in a new tab.
- Search and content filters return results.
- The 404 page displays for an invalid path.
- The favicon, social image, manifest, sitemap, and robots file are available.
- No unconfirmed date, room, funding amount, speaker, award, sponsor, or partnership is presented as final.

## Rollback

If a release is broken:

1. Open the repository’s Actions tab and confirm which commit introduced the issue.
2. Revert that commit locally or through a reviewed pull request.
3. Run the build and checks again.
4. Push the revert to `main`.

```bash
git revert <commit-sha>
python scripts/build.py
python scripts/check_site.py
git push
```

Do not delete deployment history or force-push over a published release unless repository recovery requires it.
