<p align="center">
  <img src="assets/images/logo-mark.svg" alt="Oberlin 3-2 Engineering Society" width="150">
</p>

<h1 align="center">Oberlin 3-2 Engineering Society</h1>

<p align="center"><strong>Connect. Prepare. Build.</strong></p>

<p align="center">
  The source for the Oberlin 3-2 Engineering Society website, a student-built home for current and prospective 3-2 students and anyone interested in engineering at Oberlin.
</p>

## Website

The site is a custom static build with no framework or package dependency. It is designed to load quickly, work well on phones, remain easy for future student leaders to maintain, and deploy automatically through GitHub Pages.

### Included pages

- Home
- About
- The 3-2 pathway
- Projects
- Events
- Resources
- Join
- Contact
- Privacy
- Custom 404 page

### Included functionality

- Responsive desktop and mobile navigation
- Accessible keyboard navigation and focus states
- Reduced-motion support
- Searchable and filterable resources
- Filterable project ideas
- Expandable FAQ sections
- Google Form join flow and QR code
- Instagram, email, and recruitment calls to action
- Search-engine metadata, social sharing image, sitemap, robots file, and web manifest
- Automated GitHub Pages build, validation, and deployment
- Custom-domain configuration for `oberlin32engineeringsociety.com`

## Local development

The only requirement is Python 3.10 or newer.

```bash
python scripts/build.py
python scripts/check_site.py
python -m http.server 8000 --directory site
```

Then open `http://localhost:8000` in a browser.

## Updating content

Most routine updates do not require changing page templates.

| File | Purpose |
| --- | --- |
| `content/site.json` | Club name, domain, email, social accounts, advisor, and global details |
| `content/events.json` | Upcoming events and launch milestones |
| `content/projects.json` | Project tracks and project ideas |
| `content/resources.json` | Academic, career, building, and club resources |
| `scripts/build.py` | Page content, templates, navigation, and generated files |
| `assets/css/styles.css` | Visual design and responsive layout |
| `assets/js/main.js` | Navigation, filtering, FAQ, animation, and interactions |

After an edit, rebuild and validate:

```bash
python scripts/build.py
python scripts/check_site.py
```

## Deployment

Every push to `main` runs `.github/workflows/deploy-pages.yml`. The workflow:

1. Checks out the repository.
2. Builds the site from the content files.
3. Runs automated site checks.
4. Uploads the generated `site/` directory.
5. Publishes it with GitHub Pages.

See [`docs/DOMAIN_SETUP.md`](docs/DOMAIN_SETUP.md) for the one-time GitHub Pages and DNS setup.

## Project standards

- Keep dates and event statuses accurate.
- Do not present tentative funding, partnerships, or events as confirmed.
- Link back to official Oberlin sources for formal 3-2 requirements.
- Keep membership language open to all Oberlin students interested in engineering.
- Never commit passwords, private keys, form response exports, or student contact lists.

## Disclaimer

The Oberlin 3-2 Engineering Society is a student-led proposed organization. This repository and website are not official Oberlin College publications. Formal 3-2 requirements should always be verified with the program director and the relevant partner institution.

## License

Code is available under the [MIT License](LICENSE). Club names, logos, and original brand assets remain associated with the Oberlin 3-2 Engineering Society and should not be used to imply endorsement or affiliation without permission.
