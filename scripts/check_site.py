#!/usr/bin/env python3
"""Fast, dependency-free checks for the generated website."""

from __future__ import annotations

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CONTENT = ROOT / "content"


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str, str]] = []
        self.images_without_alt: list[str] = []
        self.blank_links_without_rel: list[str] = []
        self.h1_count = 0
        self.title_count = 0
        self.description_count = 0
        self.canonical_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        for attribute in ("href", "src"):
            if values.get(attribute):
                self.references.append((tag, attribute, values[attribute]))

        if tag == "img" and "alt" not in values:
            self.images_without_alt.append(values.get("src", "<unknown>"))
        if tag == "a" and values.get("target") == "_blank":
            rel = set(values.get("rel", "").split())
            if "noopener" not in rel:
                self.blank_links_without_rel.append(values.get("href", "<unknown>"))
        if tag == "h1":
            self.h1_count += 1
        if tag == "title":
            self.title_count += 1
        if tag == "meta" and values.get("name") == "description" and values.get("content"):
            self.description_count += 1
        if tag == "link" and values.get("rel") == "canonical" and values.get("href"):
            self.canonical_count += 1


def local_target(page: Path, reference: str) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme or reference.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return None
    clean_path = parsed.path
    if not clean_path:
        return None
    return SITE / clean_path.lstrip("/") if clean_path.startswith("/") else page.parent / clean_path


def main() -> int:
    errors: list[str] = []

    for name in ("site.json", "projects.json", "events.json", "resources.json"):
        path = CONTENT / name
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - a build check should report any parse failure.
            errors.append(f"Invalid JSON in {path.relative_to(ROOT)}: {exc}")

    html_pages = sorted(SITE.glob("*.html"))
    expected_pages = {
        "index.html", "about.html", "programs.html", "projects.html", "events.html",
        "resources.html", "join.html", "contact.html", "privacy.html", "404.html",
    }
    missing_pages = expected_pages - {page.name for page in html_pages}
    if missing_pages:
        errors.append(f"Missing pages: {', '.join(sorted(missing_pages))}")

    for page in html_pages:
        parser = DocumentParser()
        try:
            parser.feed(page.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Could not parse {page.name}: {exc}")
            continue

        if page.name != "404.html":
            if parser.h1_count != 1:
                errors.append(f"{page.name}: expected exactly one h1, found {parser.h1_count}")
            if parser.title_count != 1:
                errors.append(f"{page.name}: expected exactly one title, found {parser.title_count}")
            if parser.description_count != 1:
                errors.append(f"{page.name}: expected one meta description, found {parser.description_count}")
            if parser.canonical_count != 1:
                errors.append(f"{page.name}: expected one canonical link, found {parser.canonical_count}")

        for image in parser.images_without_alt:
            errors.append(f"{page.name}: image missing alt attribute: {image}")
        for link in parser.blank_links_without_rel:
            errors.append(f"{page.name}: target=_blank link missing rel=noopener: {link}")
        for _, _, reference in parser.references:
            target = local_target(page, reference)
            if target is not None and not target.exists():
                errors.append(f"{page.name}: missing local reference {reference}")

    required_files = (
        "CNAME", ".nojekyll", "robots.txt", "sitemap.xml", "manifest.webmanifest",
        "assets/css/styles.css", "assets/js/main.js", "assets/images/logo-mark.svg",
        "assets/images/join-qr.png", "assets/images/og-cover.png",
    )
    for relative in required_files:
        if not (SITE / relative).exists():
            errors.append(f"Missing generated file: {relative}")

    cname = (SITE / "CNAME").read_text(encoding="utf-8").strip() if (SITE / "CNAME").exists() else ""
    if cname != "oberlin32engineeringsociety.com":
        errors.append(f"Unexpected CNAME value: {cname!r}")

    if errors:
        print("Site checks failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"Site checks passed: {len(html_pages)} HTML pages and all required assets are present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
