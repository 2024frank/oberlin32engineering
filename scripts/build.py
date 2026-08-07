#!/usr/bin/env python3
"""Build the Oberlin 3-2 Engineering Society static website.

The build has no third-party Python dependencies. It renders page bodies into the
shared template, copies content and assets, writes runtime configuration, and
creates deployment files for GitHub Pages.
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
OUT = ROOT / "site"
DOMAIN = "https://oberlin32engineeringsociety.com"

PAGES: dict[str, dict[str, str]] = {
    "index": {
        "title": "Oberlin 3-2 Engineering Society",
        "description": "A student-led home for engineering-minded Obies to connect, prepare, build, and create visible impact.",
        "page_id": "home",
        "body_class": "home",
        "path": "",
    },
    "about": {
        "title": "About · Oberlin 3-2 Engineering Society",
        "description": "Our mission, operating model, values, and plan for building a lasting engineering community at Oberlin.",
        "page_id": "about",
        "body_class": "inner-page",
        "path": "about.html",
    },
    "pathway": {
        "title": "3-2 Pathway · Oberlin 3-2 Engineering Society",
        "description": "A peer-built planning hub for understanding Oberlin's five-year 3-2 engineering pathway and asking better advising questions.",
        "page_id": "pathway",
        "body_class": "inner-page",
        "path": "pathway.html",
    },
    "projects": {
        "title": "Project Board · Oberlin 3-2 Engineering Society",
        "description": "Explore open engineering projects, join a team, propose a problem, and follow work from brief to public demonstration.",
        "page_id": "projects",
        "body_class": "inner-page",
        "path": "projects.html",
    },
    "competition": {
        "title": "Oberlin Engineering Challenge · Oberlin 3-2 Engineering Society",
        "description": "A proposed future engineering challenge concept: its purpose, format, safeguards, and feasibility.",
        "page_id": "competition",
        "body_class": "inner-page competition-page",
        "path": "competition.html",
    },
    "leadership": {
        "title": "Leadership + Archive · Oberlin 3-2 Engineering Society",
        "description": "Meet the organizing team, explore open roles, and follow the public archive of society leadership.",
        "page_id": "leadership",
        "body_class": "inner-page",
        "path": "leadership.html",
    },
    "events": {
        "title": "Events + News · Oberlin 3-2 Engineering Society",
        "description": "Panels, project nights, design reviews, community gatherings, competition milestones, and society news.",
        "page_id": "events",
        "body_class": "inner-page",
        "path": "events.html",
    },
    "opportunities": {
        "title": "Opportunities · Oberlin 3-2 Engineering Society",
        "description": "Leadership, project, internship, research, competition, mentorship, and partnership opportunities.",
        "page_id": "opportunities",
        "body_class": "inner-page",
        "path": "opportunities.html",
    },
    "resources": {
        "title": "Resource Hub · Oberlin 3-2 Engineering Society",
        "description": "Official 3-2 program links, academic planning resources, partner schools, careers, project tools, and shared knowledge.",
        "page_id": "resources",
        "body_class": "inner-page",
        "path": "resources.html",
    },
    "impact": {
        "title": "Impact + Archive · Oberlin 3-2 Engineering Society",
        "description": "A transparent record of the society's projects, programs, leadership, milestones, annual reports, and public outcomes.",
        "page_id": "impact",
        "body_class": "inner-page",
        "path": "impact.html",
    },
    "join": {
        "title": "Join · Oberlin 3-2 Engineering Society",
        "description": "Join the community, take a leadership role, explore a project team, or help shape future programs.",
        "page_id": "join",
        "body_class": "inner-page",
        "path": "join.html",
    },
    "contact": {
        "title": "Contact + Partnerships · Oberlin 3-2 Engineering Society",
        "description": "Contact the society about membership, projects, speakers, alumni involvement, sponsorships, and partnerships.",
        "page_id": "contact",
        "body_class": "inner-page",
        "path": "contact.html",
    },
    "media": {
        "title": "Media Kit · Oberlin 3-2 Engineering Society",
        "description": "Organization boilerplate, approved logos, brand colors, contact information, and media resources.",
        "page_id": "media",
        "body_class": "inner-page",
        "path": "media.html",
    },
    "privacy": {
        "title": "Privacy · Oberlin 3-2 Engineering Society",
        "description": "Privacy information for forms, analytics, and content on the society website.",
        "page_id": "privacy",
        "body_class": "inner-page legal-page",
        "path": "privacy.html",
    },
    "404": {
        "title": "Page Not Found · Oberlin 3-2 Engineering Society",
        "description": "The requested page could not be found.",
        "page_id": "404",
        "body_class": "inner-page error-page",
        "path": "404.html",
    },
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def asset_revision() -> str:
    """Hash every deployable asset, including the admin.

    src/admin was excluded, so editing admin.css never changed the revision.
    A correct build shipped while browsers kept serving the cached stylesheet.
    """
    digest = hashlib.sha256()
    for root in (SRC / "assets", SRC / "admin"):
        for path in sorted(root.rglob("*")):
            if path.is_file():
                digest.update(path.relative_to(ROOT).as_posix().encode())
                digest.update(path.read_bytes())
    return digest.hexdigest()[:10]


def build_pages(revision: str) -> None:
    base = read(SRC / "templates" / "base.html")
    header = read(SRC / "partials" / "header.html")
    footer = read(SRC / "partials" / "footer.html")

    for stem, meta in PAGES.items():
        source = SRC / "pages" / f"{stem}.html"
        if not source.exists():
            raise FileNotFoundError(f"Missing page body: {source}")
        canonical = f"{DOMAIN}/{meta['path']}"
        rendered = (
            base.replace("{{TITLE}}", meta["title"])
            .replace("{{DESCRIPTION}}", meta["description"])
            .replace("{{CANONICAL}}", canonical)
            .replace("{{BODY_CLASS}}", meta["body_class"])
            .replace("{{PAGE_ID}}", meta["page_id"])
            .replace("{{ASSET_REV}}", revision)
            .replace("{{HEADER}}", header)
            .replace("{{MAIN}}", read(source))
            .replace("{{FOOTER}}", footer)
        )
        write(OUT / f"{stem}.html", rendered)


def copy_tree(source: Path, target: Path) -> None:
    if source.exists():
        shutil.copytree(source, target, dirs_exist_ok=True)


def runtime_config() -> str:
    config = {
        "supabaseUrl": os.getenv("SUPABASE_URL", ""),
        "supabaseAnonKey": os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY", ""),
        "contactEmail": os.getenv("CONTACT_EMAIL", "fkusiapp@oberlin.edu"),
        "repository": os.getenv("GITHUB_REPOSITORY", "2024frank/oberlin32engineering"),
        "storageBucket": os.getenv("SUPABASE_STORAGE_BUCKET", "society-media"),
        "environment": os.getenv("SITE_ENV", "production"),
        "buildTime": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    payload = json.dumps(config, ensure_ascii=False, separators=(",", ":"))
    return f"window.O32_CONFIG = Object.freeze({payload});\n"


def generate_manifest() -> str:
    return json.dumps(
        {
            "name": "Oberlin 3-2 Engineering Society",
            "short_name": "Oberlin 3-2",
            "description": "Connect. Prepare. Build.",
            "start_url": "./index.html",
            "scope": "./",
            "display": "standalone",
            "background_color": "#080b10",
            "theme_color": "#080b10",
            "icons": [
                {"src": "assets/images/icon-192.png", "sizes": "192x192", "type": "image/png"},
                {"src": "assets/images/icon-512.png", "sizes": "512x512", "type": "image/png"},
                {"src": "assets/images/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            ],
        },
        indent=2,
    ) + "\n"


def generate_sitemap() -> str:
    urls = []
    for stem, meta in PAGES.items():
        if stem in {"404", "privacy"}:
            continue
        priority = "1.0" if stem == "index" else ("0.9" if stem in {"projects", "competition", "join"} else "0.7")
        location = f"{DOMAIN}/{meta['path']}"
        urls.append(f"  <url><loc>{html.escape(location)}</loc><changefreq>weekly</changefreq><priority>{priority}</priority></url>")
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + "\n".join(urls) + "\n</urlset>\n"


def generate_rss() -> str:
    posts = json.loads(read(ROOT / "content" / "news.json"))
    posts = [post for post in posts if post.get("published", True)]
    posts.sort(key=lambda item: item.get("published_at", ""), reverse=True)
    items = []
    for post in posts[:20]:
        title = html.escape(str(post.get("title", "Update")))
        description = html.escape(str(post.get("excerpt", "")))
        slug = quote(str(post.get("slug", post.get("id", "update"))))
        link = f"{DOMAIN}/events.html?story={slug}#news"
        date = post.get("published_at", "")
        try:
            parsed = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
            pubdate = parsed.strftime("%a, %d %b %Y %H:%M:%S +0000")
        except ValueError:
            pubdate = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
        body = html.escape(str(post.get("body", post.get("excerpt", ""))))
        items.append(
            "<item>"
            f"<title>{title}</title><link>{html.escape(link)}</link><guid>{html.escape(link)}</guid>"
            f"<pubDate>{pubdate}</pubDate><description>{description}</description>"
            f"<content:encoded><![CDATA[<p>{body}</p>]]></content:encoded>"
            "</item>"
        )
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<rss version=\"2.0\" xmlns:content=\"http://purl.org/rss/1.0/modules/content/\">"
        "<channel><title>Oberlin 3-2 Engineering Society</title>"
        f"<link>{DOMAIN}</link><description>News, project updates, and society field notes.</description>"
        + "".join(items)
        + "</channel></rss>\n"
    )


def generate_service_worker(revision: str) -> str:
    shell = [
        "./",
        "./index.html",
        "./about.html",
        "./pathway.html",
        "./projects.html",
        "./competition.html",
        "./leadership.html",
        "./events.html",
        "./resources.html",
        "./join.html",
        "./assets/css/site.css",
        "./assets/js/data-service.js",
        "./assets/js/site.js",
        "./assets/js/pages.js",
        "./assets/images/logo-mark.svg",
        "./content/site.json",
        "./content/projects.json",
        "./content/events.json",
        "./content/leaders.json",
    ]
    return f"""const CACHE = 'o32-{revision}';
const SHELL = {json.dumps(shell)};
self.addEventListener('install', (event) => {{
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', (event) => {{
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', (event) => {{
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.destination === 'document') {{
    event.respondWith(fetch(event.request).then((response) => {{
      const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response;
    }}).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
    return;
  }}
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {{
    if (response.ok) {{ const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); }}
    return response;
  }})));
}});
"""


def stamp_admin_assets(revision: str) -> None:
    """Version the admin's own CSS/JS URLs.

    The admin is copied verbatim rather than templated, so its <link>/<script>
    tags carried no cache key. Browsers held a stale admin.css across deploys
    and kept rendering the previous theme even after a successful build.
    """
    index = OUT / "admin" / "index.html"
    if not index.exists():
        return
    markup = index.read_text(encoding="utf-8")
    markup = re.sub(
        r'(href|src)="(admin\.(?:css|js))(?:\?v=[^"]*)?"',
        lambda m: f'{m.group(1)}="{m.group(2)}?v={revision}"',
        markup,
    )
    # runtime-config.js is shared with the public site, which is served
    # immutable for a year. Without a cache key the admin kept booting an
    # old config and reported CONFIG_REQUIRED after Supabase was connected.
    markup = re.sub(
        r'src="(\.\./assets/js/[a-z-]+\.js)(?:\?v=[^"]*)?"',
        lambda m: f'src="{m.group(1)}?v={revision}"',
        markup,
    )
    index.write_text(markup, encoding="utf-8")


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    revision = asset_revision()
    build_pages(revision)
    copy_tree(SRC / "assets", OUT / "assets")
    copy_tree(ROOT / "content", OUT / "content")
    copy_tree(SRC / "admin", OUT / "admin")
    stamp_admin_assets(revision)

    write(OUT / "assets" / "js" / "runtime-config.js", runtime_config())
    write(OUT / "site.webmanifest", generate_manifest())
    write(OUT / "sitemap.xml", generate_sitemap())
    write(OUT / "feed.xml", generate_rss())
    write(OUT / "service-worker.js", generate_service_worker(revision))
    write(OUT / "robots.txt", f"User-agent: *\nAllow: /\nSitemap: {DOMAIN}/sitemap.xml\n")
    write(OUT / "CNAME", "oberlin32engineeringsociety.com\n")
    write(OUT / ".nojekyll", "")
    write(OUT / "humans.txt", "Oberlin 3-2 Engineering Society\nFounded in 2026 at Oberlin College.\nBuilt for continuity.\n")
    write(OUT / ".well-known" / "security.txt", "Contact: mailto:fkusiapp@oberlin.edu\nPreferred-Languages: en\nCanonical: https://oberlin32engineeringsociety.com/.well-known/security.txt\n")

    print(f"Built {len(PAGES)} pages in {OUT} (asset revision {revision}).")


if __name__ == "__main__":
    build()
