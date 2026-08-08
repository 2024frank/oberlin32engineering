#!/usr/bin/env python3
"""Build the versioned static source into the deployable site/ directory."""

from __future__ import annotations

import hashlib
import html
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
CONTENT = ROOT / "content"
OUT = ROOT / "site"
DOMAIN = "https://www.oberlin32engineeringsociety.com"

PAGES: dict[str, dict[str, str]] = {
    "index": {
        "title": "Oberlin 3-2 Engineering Society | Oberlin College Student Group",
        "description": "The student society for Oberlin College's 3-2 engineering program. Peer advice on the dual-degree pathway, partner schools, projects, and events. Open to any Oberlin student interested in engineering.",
    },
    "about": {
        "title": "About the Oberlin 3-2 Engineering Society",
        "description": "Why the Oberlin 3-2 Engineering Society is being formed, what it will focus on, and who it is for.",
    },
    "pathway": {
        "title": "Oberlin 3-2 Engineering Pathway: A Student Planning Guide",
        "description": "A student planning guide to Oberlin's 3-2 engineering pathway, partner-school requirements, course sequencing, cost, financial aid, and degree timelines.",
    },
    "projects": {
        "title": "Engineering Projects · Oberlin 3-2 Engineering Society",
        "description": "Learn how the Oberlin 3-2 Engineering Society will choose and run student projects after the founding membership forms.",
    },
    "competition": {
        "title": "Future Engineering Showcase Idea · Oberlin 3-2 Engineering Society",
        "description": "A possible future Oberlin engineering showcase and the team, venue, safety, funding, and access requirements it would need.",
    },
    "leadership": {
        "title": "Leadership and Open Roles · Oberlin 3-2 Engineering Society",
        "description": "The students organizing the Oberlin 3-2 Engineering Society, the officer roles that are still open, and what each one involves.",
    },
    "events": {
        "title": "Events · Oberlin 3-2 Engineering Society | Oberlin College",
        "description": "Planned society meetups, project sessions, 3-2 conversations, and confirmed event details when available.",
    },
    "opportunities": {
        "title": "Opportunities · Oberlin 3-2 Engineering Society",
        "description": "Current society roles, project openings, and trusted external starting points for engineering opportunities.",
    },
    "resources": {
        "title": "3-2 Engineering Resources for Oberlin Students",
        "description": "Checked links for Oberlin College 3-2 engineering planning: official advising guides, the four partner schools, financial aid, internships, research, and technical learning.",
    },
    "impact": {
        "title": "Founding Roadmap · Oberlin 3-2 Engineering Society",
        "description": "A public roadmap of the society's concrete founding commitments, current status, and future reports.",
    },
    "join": {
        "title": "Join the Oberlin 3-2 Engineering Society",
        "description": "Join the engineering community at Oberlin College as a member, project contributor, event volunteer, or officer. No experience required, and you do not have to be in the 3-2 program.",
    },
    "contact": {
        "title": "Contact · Oberlin 3-2 Engineering Society",
        "description": "Contact the student organizing team with questions, project ideas, event proposals, or practical offers of help.",
    },
    "media": {
        "title": "Media Information · Oberlin 3-2 Engineering Society",
        "description": "Accurate boilerplate, logo files, photo guidance, and contact information for the founding society.",
    },
    "404": {
        "title": "Page Not Found · Oberlin 3-2 Engineering Society",
        "description": "The requested page could not be found.",
        "robots": "noindex, follow",
    },
}


def write(path: Path, value: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(value, bytes):
        path.write_bytes(value)
    else:
        path.write_text(value, encoding="utf-8")


def copy_tree(source: Path, target: Path) -> None:
    if source.exists():
        shutil.copytree(source, target, dirs_exist_ok=True)


def asset_revision() -> str:
    digest = hashlib.sha256()
    roots = [SRC / "assets", SRC / "partials", SRC / "templates", SRC / "pages", CONTENT]
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(item for item in root.rglob("*") if item.is_file()):
            digest.update(path.relative_to(ROOT).as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def page_url(page_id: str) -> str:
    return DOMAIN + ("/" if page_id == "index" else f"/{page_id}")


# The pathway page answers the questions people actually search. Marking them
# up as an FAQPage lets Google show the answer directly under the result.
PATHWAY_FAQ = """  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Oberlin College's 3-2 engineering program?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oberlin describes it as a pathway with three years of liberal-arts and pre-engineering study at Oberlin followed by engineering study at an affiliated school. Partner structures and degrees differ, so students must verify the current requirements for the program they intend to enter."
        }
      },
      {
        "@type": "Question",
        "name": "Which engineering schools does Oberlin partner with for 3-2?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oberlin's affiliated engineering schools are the California Institute of Technology, Case Western Reserve University, Columbia University, and Washington University in St. Louis. Each has its own requirements, so confirm the current details with Oberlin advising and the partner school."
        }
      },
      {
        "@type": "Question",
        "name": "Do you have to commit to 3-2 to join the Oberlin 3-2 Engineering Society?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. The society is open to any current Oberlin College student interested in engineering, including students who are still deciding and students who never intend to transfer. No prior technical experience is required."
        }
      },
      {
        "@type": "Question",
        "name": "Does every Oberlin 3-2 pathway take five years?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No single timeline applies to every partner. Caltech and Case Western currently describe five-year routes, while Washington University currently describes a six-year route ending in three degrees. Students should verify the current structure with Oberlin and the partner school."
        }
      }
    ]
  }
  </script>"""

PAGE_SCHEMA = {"pathway": PATHWAY_FAQ}


def build_pages(revision: str) -> None:
    template = (SRC / "templates" / "base.html").read_text(encoding="utf-8")
    header = (SRC / "partials" / "header.html").read_text(encoding="utf-8")
    footer = (SRC / "partials" / "footer.html").read_text(encoding="utf-8")
    for page_id, metadata in PAGES.items():
        body = (SRC / "pages" / f"{page_id}.html").read_text(encoding="utf-8")
        output = template
        replacements = {
            "{{TITLE}}": metadata["title"],
            "{{DESCRIPTION}}": metadata["description"],
            "{{ROBOTS}}": metadata.get("robots", "index, follow"),
            "{{CANONICAL}}": page_url(page_id),
            "{{ASSET_REV}}": revision,
            "{{BODY_CLASS}}": f"page page--{page_id}",
            "{{PAGE_ID}}": page_id,
            "{{HEADER}}": header,
            "{{MAIN}}": body,
            "{{FOOTER}}": footer,
            "{{PAGE_SCHEMA}}": PAGE_SCHEMA.get(page_id, ""),
        }
        for token, value in replacements.items():
            output = output.replace(token, value)
        # /assets/* is served immutable for a year, so a photo swapped in at the
        # same path would never reach a returning visitor. Stamp the revision on
        # image URLs the same way the template already stamps CSS and JS.
        output = re.sub(
            r'(src="assets/images/[^"?]+\.(?:jpg|png|svg))"',
            rf'\1?v={revision}"',
            output,
        )
        filename = "index.html" if page_id == "index" else f"{page_id}.html"
        write(OUT / filename, output)


def runtime_config() -> str:
    site_settings = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
    portal_enabled = (os.getenv("NEXT_PUBLIC_ENABLE_PORTAL") or "").strip().lower() == "true"
    database_enabled = portal_enabled and (os.getenv("NEXT_PUBLIC_USE_DATABASE") or "").strip().lower() == "true"
    public = {
        # Keep the browser key out of the public build during the database cutover.
        # Public forms use the server-only API and do not need these values.
        "supabaseUrl": (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL") or "") if portal_enabled else "",
        "supabaseAnonKey": (os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY") or "") if portal_enabled else "",
        "storageBucket": os.getenv("SUPABASE_STORAGE_BUCKET") or "society-media",
        "portalEnabled": portal_enabled,
        "useDatabase": database_enabled,
        "contentVersion": site_settings.get("content_version", ""),
    }
    return "window.O32_CONFIG = " + json.dumps(public, separators=(",", ":")) + ";\n"


def generate_manifest() -> str:
    manifest = {
        "name": "Oberlin 3-2 Engineering Society",
        "short_name": "Oberlin 3-2",
        "description": "A student group for engineering projects and 3-2 planning at Oberlin College.",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#f7f4ef",
        "theme_color": "#8f1733",
        "icons": [
            {"src": "assets/images/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "assets/images/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "assets/images/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    return json.dumps(manifest, indent=2) + "\n"


def generate_sitemap() -> str:
    public_ids = [page_id for page_id in PAGES if page_id != "404"]
    # lastmod and priority tell a crawler which pages are worth recrawling and
    # which matter most. The date comes from the page source so it stays honest.
    priority = {"index": "1.0", "pathway": "0.9", "join": "0.9", "about": "0.8", "leadership": "0.8"}
    def entry(page_id: str) -> str:
        source = SRC / "pages" / f"{page_id}.html"
        stamp = datetime.fromtimestamp(source.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d")
        return (f"<url><loc>{html.escape(page_url(page_id))}</loc>"
                f"<lastmod>{stamp}</lastmod>"
                f"<changefreq>weekly</changefreq>"
                f"<priority>{priority.get(page_id, '0.6')}</priority></url>")
    entries = "".join(entry(page_id) for page_id in public_ids)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n'


def xml_text(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def generate_rss() -> str:
    news = json.loads((CONTENT / "news.json").read_text(encoding="utf-8"))
    updates = json.loads((CONTENT / "project_updates.json").read_text(encoding="utf-8"))
    records: list[dict] = []
    for post in news:
        if post.get("published", True):
            records.append({
                "title": post.get("title"),
                "description": post.get("excerpt"),
                "body": post.get("body"),
                "date": post.get("published_at"),
                "url": f"{DOMAIN}/events#news",
            })
    for update in updates:
        if update.get("published", True):
            records.append({
                "title": update.get("title"),
                "description": update.get("summary"),
                "body": update.get("body"),
                "date": update.get("published_at"),
                "url": f"{DOMAIN}/projects#updates",
            })
    records.sort(key=lambda item: str(item.get("date") or ""), reverse=True)
    items = []
    for record in records[:30]:
        try:
            date = datetime.fromisoformat(str(record.get("date") or "")).replace(tzinfo=timezone.utc)
        except ValueError:
            date = datetime.now(timezone.utc)
        pubdate = date.strftime("%a, %d %b %Y %H:%M:%S +0000")
        link = str(record["url"])
        items.append(
            "<item>"
            f"<title>{xml_text(record['title'])}</title>"
            f"<link>{xml_text(link)}</link><guid>{xml_text(link + '#' + safe_slug(str(record['title'])))}</guid>"
            f"<pubDate>{pubdate}</pubDate>"
            f"<description>{xml_text(record['description'])}</description>"
            f"<content:encoded><![CDATA[<p>{html.escape(str(record.get('body') or ''))}</p>]]></content:encoded>"
            "</item>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">'
        '<channel><title>Oberlin 3-2 Engineering Society</title>'
        f'<link>{DOMAIN}</link><description>Confirmed news and project updates from the society.</description>'
        + "".join(items) + "</channel></rss>\n"
    )


def safe_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:80]


def generate_service_worker(revision: str) -> str:
    shell = [
        "./", "./index.html", "./about.html", "./pathway.html", "./projects.html",
        "./events.html", "./resources.html", "./join.html", "./contact.html",
        "./assets/css/site.css", "./assets/js/data-service.js", "./assets/js/site.js",
        "./assets/js/pages.js", "./assets/images/logo-mark.svg", "./content/site.json",
        "./content/projects.json", "./content/events.json", "./content/resources.json",
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
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }}).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
    return;
  }}
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {{
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }})));
}});
"""


def stamp_admin_assets(revision: str) -> None:
    path = OUT / "admin" / "index.html"
    if not path.exists():
        return
    markup = path.read_text(encoding="utf-8")
    markup = re.sub(r'(href|src)="(admin\.(?:css|js))(?:\?v=[^"]*)?"', lambda match: f'{match.group(1)}="{match.group(2)}?v={revision}"', markup)
    markup = re.sub(r'src="(\.\./assets/js/runtime-config\.js)(?:\?v=[^"]*)?"', lambda match: f'src="{match.group(1)}?v={revision}"', markup)
    path.write_text(markup, encoding="utf-8")


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    revision = asset_revision()
    build_pages(revision)
    copy_tree(SRC / "assets", OUT / "assets")
    copy_tree(CONTENT, OUT / "content")
    copy_tree(SRC / "admin", OUT / "admin")
    stamp_admin_assets(revision)
    write(OUT / "assets/js/runtime-config.js", runtime_config())
    write(OUT / "site.webmanifest", generate_manifest())
    write(OUT / "sitemap.xml", generate_sitemap())
    write(OUT / "feed.xml", generate_rss())
    write(OUT / "service-worker.js", generate_service_worker(revision))
    write(OUT / "robots.txt", f"User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: {DOMAIN}/sitemap.xml\n")
    write(OUT / "CNAME", "oberlin32engineeringsociety.com\n")
    write(OUT / ".nojekyll", "")
    write(OUT / "humans.txt", "Oberlin 3-2 Engineering Society\nStudent-led. Founding stage, 2026–27.\n")
    write(OUT / ".well-known/security.txt", "Contact: mailto:fkusiapp@oberlin.edu\nPreferred-Languages: en\nCanonical: https://www.oberlin32engineeringsociety.com/.well-known/security.txt\n")
    print(f"Built {len(PAGES)} pages in {OUT} (asset revision {revision}).")


if __name__ == "__main__":
    build()
