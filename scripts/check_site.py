#!/usr/bin/env python3
"""Validate the generated public website, content fallbacks, and admin release."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CONTENT = ROOT / "content"

PUBLIC_PAGES = {
    "index.html", "about.html", "pathway.html", "projects.html", "competition.html",
    "leadership.html", "events.html", "opportunities.html", "resources.html", "impact.html",
    "join.html", "contact.html", "media.html", "privacy.html", "404.html",
}

JSON_TYPES = {
    "site.json": dict,
    "competition.json": dict,
    "impact.json": dict,
    "projects.json": list,
    "project_updates.json": list,
    "leaders.json": list,
    "events.json": list,
    "resources.json": list,
    "opportunities.json": list,
    "news.json": list,
    "sponsors.json": list,
    "partners.json": list,
    "documents.json": list,
}

REQUIRED_RELEASE_FILES = {
    "CNAME", ".nojekyll", "robots.txt", "sitemap.xml", "site.webmanifest",
    "service-worker.js", "feed.xml", "humans.txt", ".well-known/security.txt",
    "assets/css/site.css", "assets/js/runtime-config.js", "assets/js/data-service.js",
    "assets/js/site.js", "assets/js/pages.js", "assets/images/logo-mark.svg",
    "assets/images/logo-wordmark.svg", "assets/images/icon-192.png",
    "assets/images/icon-512.png", "assets/images/icon-maskable.png",
    "assets/images/og-cover.png", "admin/index.html", "admin/admin.css", "admin/admin.js",
}

REQUIRED_REPOSITORY_FILES = {
    "README.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md",
    ".github/workflows/deploy-pages.yml", "database/schema.sql", "database/seed.sql",
    "docs/ADMIN_SETUP.md", "docs/CONTENT_GUIDE.md", "docs/DEPLOYMENT.md",
    "docs/DOMAIN_SETUP.md", "docs/OPERATIONS.md",
}

PROHIBITED_PUBLIC_PHRASES = {
    "officially chartered",
    "charter approved",
    "funding confirmed",
    "confirmed sponsor",
    "spring 2027 · inaugural season",
}


class Parser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[str] = []
        self.img_missing_alt: list[str] = []
        self.blank_missing_noopener: list[str] = []
        self.h1 = 0
        self.title = 0
        self.descriptions = 0
        self.canonicals = 0
        self.ids: list[str] = []
        self.html_lang = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        for name in ("href", "src"):
            if values.get(name):
                self.refs.append(values[name])
        if tag == "html":
            self.html_lang = values.get("lang", "")
        if tag == "img" and "alt" not in values:
            self.img_missing_alt.append(values.get("src", "<unknown>"))
        if tag == "a" and values.get("target") == "_blank" and "noopener" not in values.get("rel", "").split():
            self.blank_missing_noopener.append(values.get("href", "<unknown>"))
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.title += 1
        if tag == "meta" and values.get("name") == "description" and values.get("content"):
            self.descriptions += 1
        if tag == "link" and "canonical" in values.get("rel", "").split() and values.get("href"):
            self.canonicals += 1
        if values.get("id"):
            self.ids.append(values["id"])


def local_target(page: Path, ref: str) -> Path | None:
    if not ref or ref.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return None
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    if parsed.path.startswith("/"):
        candidate = SITE / parsed.path.lstrip("/")
    else:
        candidate = page.parent / parsed.path

    # Vercel serves pages with cleanUrls, so internal links are extensionless.
    # "/" is the home page and "contact" is contact.html on disk.
    if candidate.exists():
        return candidate
    if parsed.path in ("", "/"):
        return SITE / "index.html"
    if not candidate.suffix:
        with_html = candidate.with_suffix(".html")
        if with_html.exists():
            return with_html
    return candidate


def check_json(errors: list[str]) -> None:
    for name, expected_type in JSON_TYPES.items():
        path = CONTENT / name
        if not path.exists():
            errors.append(f"Missing content file: {name}")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{name}: invalid JSON ({exc})")
            continue
        if not isinstance(data, expected_type):
            errors.append(f"{name}: expected {expected_type.__name__}, found {type(data).__name__}")
            continue
        if isinstance(data, list):
            ids = [row.get("id") for row in data if isinstance(row, dict)]
            duplicates = sorted({item for item in ids if item and ids.count(item) > 1})
            if duplicates:
                errors.append(f"{name}: duplicate IDs: {', '.join(duplicates)}")
            missing_ids = [str(index + 1) for index, row in enumerate(data) if not isinstance(row, dict) or not row.get("id")]
            if missing_ids:
                errors.append(f"{name}: records missing IDs at positions {', '.join(missing_ids)}")

    site_data = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
    status = str(site_data.get("status", "")).lower()
    if "formation" not in status and "founding" not in status:
        errors.append("site.json: status must identify the Society as being in its founding or formation stage")
    if site_data.get("domain") != "https://oberlin32engineeringsociety.com":
        errors.append("site.json: domain does not match the production custom domain")


def check_html(errors: list[str]) -> None:
    existing = {page.name for page in SITE.glob("*.html")}
    for missing in sorted(PUBLIC_PAGES - existing):
        errors.append(f"Missing public page: {missing}")

    for page in sorted(SITE.rglob("*.html")):
        source = page.read_text(encoding="utf-8")
        relative = page.relative_to(SITE)
        if re.search(r"{{[A-Z0-9_]+}}", source):
            errors.append(f"{relative}: unresolved template token")
        lowered = source.lower()
        for phrase in PROHIBITED_PUBLIC_PHRASES:
            if phrase in lowered:
                errors.append(f"{relative}: outdated public wording: {phrase}")

        parser = Parser()
        try:
            parser.feed(source)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{relative}: HTML parser failure ({exc})")
            continue

        is_admin = relative.as_posix() == "admin/index.html"
        if parser.html_lang != "en":
            errors.append(f"{relative}: <html> must declare lang=\"en\"")
        if not is_admin:
            if parser.h1 != 1:
                errors.append(f"{relative}: expected one h1, found {parser.h1}")
            if parser.title != 1:
                errors.append(f"{relative}: expected one title, found {parser.title}")
            if parser.descriptions != 1:
                errors.append(f"{relative}: expected one meta description, found {parser.descriptions}")
            if parser.canonicals != 1:
                errors.append(f"{relative}: expected one canonical link, found {parser.canonicals}")
        else:
            if parser.title != 1:
                errors.append(f"{relative}: expected one title, found {parser.title}")
            if parser.descriptions != 1:
                errors.append(f"{relative}: expected one meta description, found {parser.descriptions}")

        duplicate_ids = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicate_ids:
            errors.append(f"{relative}: duplicate HTML IDs: {', '.join(duplicate_ids)}")
        for src in parser.img_missing_alt:
            errors.append(f"{relative}: image missing alt attribute: {src}")
        for href in parser.blank_missing_noopener:
            errors.append(f"{relative}: target=_blank link missing rel=noopener: {href}")
        for ref in parser.refs:
            target = local_target(page, ref)
            if target is not None and not target.exists():
                errors.append(f"{relative}: missing local reference {ref}")


def check_javascript(errors: list[str]) -> None:
    files = sorted((ROOT / "src").rglob("*.js"))
    for path in files:
        try:
            subprocess.run(["node", "--check", str(path)], check=True, capture_output=True, text=True)
        except FileNotFoundError:
            errors.append("Node.js is required to validate JavaScript syntax")
            return
        except subprocess.CalledProcessError as exc:
            message = (exc.stderr or exc.stdout).strip().replace("\n", " | ")
            errors.append(f"{path.relative_to(ROOT)}: JavaScript syntax error: {message}")


def check_release_files(errors: list[str]) -> None:
    for name in sorted(REQUIRED_RELEASE_FILES):
        if not (SITE / name).exists():
            errors.append(f"Missing generated file: {name}")
    for name in sorted(REQUIRED_REPOSITORY_FILES):
        if not (ROOT / name).exists():
            errors.append(f"Missing repository file: {name}")

    cname = SITE / "CNAME"
    if cname.exists() and cname.read_text(encoding="utf-8").strip() != "oberlin32engineeringsociety.com":
        errors.append("CNAME does not match oberlin32engineeringsociety.com")

    runtime = SITE / "assets/js/runtime-config.js"
    runtime_text = runtime.read_text(encoding="utf-8") if runtime.exists() else ""
    for secret_marker in ("service_role", "service-role", "postgresql://", "SUPABASE_SERVICE"):
        if secret_marker.lower() in runtime_text.lower():
            errors.append("runtime-config.js appears to expose a private database credential")

    workflow = ROOT / ".github/workflows/deploy-pages.yml"
    if workflow.exists():
        workflow_text = workflow.read_text(encoding="utf-8")
        if "scripts/build.py" not in workflow_text or "scripts/check_site.py" not in workflow_text:
            errors.append("Deployment workflow must build and validate the site before publishing")


def main() -> int:
    errors: list[str] = []
    check_json(errors)
    check_html(errors)
    check_javascript(errors)
    check_release_files(errors)

    if errors:
        print("Site checks failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(
        f"Site checks passed: {len(PUBLIC_PAGES)} public pages, the officer command center, "
        f"{len(JSON_TYPES)} content sources, deployment files, and required assets are valid."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
