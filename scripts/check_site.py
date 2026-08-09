#!/usr/bin/env python3
"""Release checks for public pages, content, backend source, and generated assets."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import date
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
APP = ROOT / "app"
CONTENT = ROOT / "content"
EXPECTED_PAGES = {
    "index.html", "about.html", "pathway.html", "projects.html", "competition.html",
    "leadership.html", "events.html", "opportunities.html", "resources.html",
    "impact.html", "join.html", "contact.html", "media.html", "404.html",
}
JSON_FILES = {
    "site.json": dict,
    "projects.json": list,
    "project_updates.json": list,
    "leaders.json": list,
    "events.json": list,
    "resources.json": list,
    "opportunities.json": list,
    "news.json": list,
    "competition.json": dict,
    "partners.json": list,
    "impact.json": dict,
    "documents.json": list,
    "sponsors.json": list,
    "photo_credits.json": list,
}
PROHIBITED_COPY = [
    "build the system", "hand it forward", "institutional memory", "command center",
    "find your people. build what matters", "move the work forward", "turn ideas into evidence",
    "design it. build it. defend it", "6 active briefs", "20+ ways to contribute",
]
PROHIBITED_CONTENT_PATTERNS = {
    r"\u2014": "an em dash",
    r"\bnot just\b.{0,120}\bbut\b": "formulaic 'not just X but Y' contrast",
    r"\bnot only\b.{0,120}\bbut also\b": "formulaic 'not only X but also Y' contrast",
    r"\bnot as (?:a )?substitute\b": "formulaic 'not as a substitute' disclaimer",
    r"\bcan help\b.{0,120}\bbut\b": "staged 'can help, but' disclaimer",
    r"\bserves as\b": "vague 'serves as' construction",
    r"\bmeant to\b": "vague 'meant to' construction",
    r"\ba place to\b": "generic 'a place to' construction",
    r"\bwhether you(?:'re| are)\b": "generic 'whether you are' introduction",
    r"\b(?:delve|unlock|unleash|game-changing|transformative journey|vibrant ecosystem)\b": "generic promotional language",
    r"\b(?:one|a shared) place to\b": "generic 'place to' construction",
    r"\bsomewhere to\b": "generic 'somewhere to' construction",
    r"\bwhat comes next\b": "formulaic 'what comes next' phrasing",
    r"\bhelp shape\b": "generic 'help shape' call to action",
}
DYNAMIC_COPY_CONFLICTS = {
    "data-event-grid": ["no events announced", "nothing scheduled yet"],
    "data-news-grid": ["no updates published yet"],
    "data-project-grid": ["no briefs have been approved"],
}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.h1_count = 0
        self.title_count = 0
        self.description = False
        self.canonical = False
        self.robots = ""
        self.html_lang = False
        self.images: list[tuple[str, str | None, str, str]] = []
        self.links: list[dict[str, str]] = []
        self.forms: list[dict[str, str]] = []
        self.current_form: dict[str, object] | None = None
        self.form_details: list[dict[str, object]] = []
        self.hidden_text_depth = 0
        self.visible_text: list[str] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        if tag in {"script", "style", "template"}:
            self.hidden_text_depth += 1
        if tag in {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "summary", "label", "button", "a"}:
            self.visible_text.append("\n")
        if tag == "html" and attrs.get("lang"):
            self.html_lang = True
        if tag == "h1":
            self.h1_count += 1
        if tag == "title":
            self.title_count += 1
        if tag == "meta" and attrs.get("name") == "description" and attrs.get("content"):
            self.description = True
        if tag == "meta" and attrs.get("name") == "robots":
            self.robots = attrs.get("content", "").lower()
        if tag == "link" and attrs.get("rel") == "canonical" and attrs.get("href"):
            self.canonical = True
        if tag == "img":
            self.images.append((attrs.get("src", ""), attrs.get("alt"), attrs.get("width", ""), attrs.get("height", "")))
        if tag == "a":
            self.links.append(attrs)
        if tag == "form":
            self.current_form = {"attrs": attrs, "honeypot": False, "status": False, "status_live": False, "submit": False}
            self.form_details.append(self.current_form)
        if self.current_form is not None:
            if tag == "input" and attrs.get("name") == "company":
                self.current_form["honeypot"] = True
            if attrs.get("data-form-status") is not None:
                self.current_form["status"] = True
                self.current_form["status_live"] = attrs.get("aria-live") == "polite" and attrs.get("role") == "status"
            if tag == "button" and attrs.get("type", "submit") == "submit":
                self.current_form["submit"] = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "form":
            self.current_form = None
        if tag in {"script", "style", "template"}:
            self.hidden_text_depth = max(0, self.hidden_text_depth - 1)
        if tag in {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "summary", "label", "button", "a"}:
            self.visible_text.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden_text_depth:
            self.visible_text.append(data)


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def local_target(page: Path, raw: str) -> Path | None:
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc:
        return None
    path = parsed.path
    if not path:
        return None
    if path.startswith("/"):
        target = SITE / path.lstrip("/")
    else:
        target = page.parent / path
    if target.is_dir():
        return target / "index.html"
    if target.exists():
        return target
    if not target.suffix:
        html_target = target.with_suffix(".html")
        if html_target.exists():
            return html_target
        index_target = target / "index.html"
        if index_target.exists():
            return index_target
    return target


def check_html(errors: list[str]) -> None:
    missing = EXPECTED_PAGES - {path.name for path in SITE.glob("*.html")}
    for name in sorted(missing):
        fail(errors, f"missing generated page: site/{name}")

    for page in sorted(SITE.glob("*.html")):
        text = page.read_text(encoding="utf-8")
        parser = PageParser()
        parser.feed(text)
        is_admin = page.name == "admin.html"
        if parser.h1_count != (2 if is_admin else 1):
            expected_label = "two mutually exclusive h1 elements" if is_admin else "exactly one h1"
            fail(errors, f"{page.relative_to(ROOT)} must contain {expected_label}; found {parser.h1_count}")
        if parser.title_count != 1:
            fail(errors, f"{page.relative_to(ROOT)} must contain exactly one title element")
        if not parser.description:
            fail(errors, f"{page.relative_to(ROOT)} is missing a meta description")
        if not parser.canonical:
            fail(errors, f"{page.relative_to(ROOT)} is missing a canonical link")
        if page.name == "404.html" and "noindex" not in parser.robots:
            fail(errors, "site/404.html must be marked noindex")
        if page.name != "404.html" and "index" not in parser.robots:
            fail(errors, f"{page.relative_to(ROOT)} is missing an indexable robots directive")
        if not parser.html_lang:
            fail(errors, f"{page.relative_to(ROOT)} is missing html[lang]")
        if re.search(r"{{\s*[A-Za-z_]", text) or re.search(r"[A-Za-z_]\s*}}", text):
            fail(errors, f"{page.relative_to(ROOT)} contains an unresolved template token")
        lower = text.lower()
        for phrase in PROHIBITED_COPY:
            if phrase in lower:
                fail(errors, f"{page.relative_to(ROOT)} contains retired copy: {phrase!r}")
        visible_text = unescape("".join(parser.visible_text))
        for pattern, description in PROHIBITED_CONTENT_PATTERNS.items():
            if re.search(pattern, visible_text, re.IGNORECASE):
                fail(errors, f"{page.relative_to(ROOT)} contains {description}")
        for marker, phrases in DYNAMIC_COPY_CONFLICTS.items():
            if marker in lower:
                for phrase in phrases:
                    if phrase in lower:
                        fail(errors, f"{page.relative_to(ROOT)} makes a static empty claim beside dynamic content: {phrase!r}")
        if "forms.gle" in lower or "docs.google.com/forms" in lower:
            fail(errors, f"{page.relative_to(ROOT)} still links to the old Google Form")
        # Motion is allowed, but only the one scoped signature animation. The
        # rule exists to stop scattered scroll-reveals coming back, so it now
        # checks that motion.js is the only animation entry point rather than
        # banning animation outright.
        if "anime.min.js" in lower:
            fail(errors, f"{page.relative_to(ROOT)} includes retired animation code")
        if "motion.js" in lower and "vendor/anime.umd.min.js" not in lower:
            fail(errors, f"{page.relative_to(ROOT)} loads motion.js without its library")

        for src, alt, width, height in parser.images:
            if not src:
                fail(errors, f"{page.relative_to(ROOT)} has an image without src")
            if alt is None:
                fail(errors, f"{page.relative_to(ROOT)} has an image without alt")
            if not width or not height:
                fail(errors, f"{page.relative_to(ROOT)} has an image without explicit dimensions: {src}")
            target = local_target(page, src)
            if target is not None and not target.exists():
                fail(errors, f"{page.relative_to(ROOT)} references missing image {src}")
        for attrs in parser.links:
            href = attrs.get("href", "")
            if attrs.get("target") == "_blank" and "noopener" not in attrs.get("rel", "").split():
                fail(errors, f"{page.relative_to(ROOT)} has target=_blank without rel=noopener: {href}")
            target = local_target(page, href)
            if target is not None and not target.exists():
                fail(errors, f"{page.relative_to(ROOT)} references missing local target {href}")
        for form in parser.form_details if not is_admin else []:
            attrs = form["attrs"]
            if "data-o32-form" not in attrs:
                fail(errors, f"{page.relative_to(ROOT)} contains a public form without data-o32-form")
            if not attrs.get("data-form-type"):
                fail(errors, f"{page.relative_to(ROOT)} contains a public form without data-form-type")
            if not form["honeypot"]:
                fail(errors, f"{page.relative_to(ROOT)} contains a public form without the bot-trap field")
            if not form["status"]:
                fail(errors, f"{page.relative_to(ROOT)} contains a public form without an accessible status element")
            if not form["status_live"]:
                fail(errors, f"{page.relative_to(ROOT)} contains a form status without role=status and aria-live=polite")
            if not form["submit"]:
                fail(errors, f"{page.relative_to(ROOT)} contains a form without a submit button")


def check_json(errors: list[str]) -> None:
    loaded: dict[str, object] = {}
    for filename, expected_type in JSON_FILES.items():
        path = CONTENT / filename
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            fail(errors, f"{path.relative_to(ROOT)} is invalid JSON: {exc}")
            continue
        loaded[filename] = value
        if not isinstance(value, expected_type):
            fail(errors, f"{path.relative_to(ROOT)} must contain {expected_type.__name__}")
        source = json.dumps(value, ensure_ascii=False)
        if filename != "photo_credits.json":
            for pattern, description in PROHIBITED_CONTENT_PATTERNS.items():
                if re.search(pattern, source, re.IGNORECASE):
                    fail(errors, f"content/{filename} contains {description}")

    # A founding society may legitimately have no projects, events, or news yet.
    # Honest empty states are preferable to publishing work or dates that have
    # not been selected and confirmed.
    for filename in ["leaders.json", "resources.json", "partners.json"]:
        records = loaded.get(filename)
        if not isinstance(records, list) or not records:
            fail(errors, f"content/{filename} must contain at least one honest public record")

    for filename in ["projects.json", "project_updates.json"]:
        records = loaded.get(filename)
        if records is not None and not isinstance(records, list):
            fail(errors, f"content/{filename} must be a list")
            continue
        ids = [str(item.get("id", "")) for item in records if isinstance(item, dict)]
        if any(not value for value in ids):
            fail(errors, f"content/{filename} has a record without id")
        if len(ids) != len(set(ids)):
            fail(errors, f"content/{filename} contains duplicate ids")

    projects = loaded.get("projects.json", [])
    for record in projects if isinstance(projects, list) else []:
        if record.get("status") == "Active" and not record.get("team_names"):
            fail(errors, f"project {record.get('id')} is marked Active without a team")
        if record.get("progress", 0) and record.get("status") in {"Open for interest", "Needs a project lead", "Idea under review"}:
            fail(errors, f"project {record.get('id')} has progress before an active scope")

    events = loaded.get("events.json", [])
    for record in events if isinstance(events, list) else []:
        if record.get("status") == "Confirmed" and not record.get("start_at"):
            fail(errors, f"event {record.get('id')} is Confirmed without start_at")
        if not record.get("date_label"):
            fail(errors, f"event {record.get('id')} needs a public date label")

    resources = loaded.get("resources.json", [])
    for record in resources if isinstance(resources, list) else []:
        if record.get("published", True) and not record.get("reviewed_at"):
            fail(errors, f"resource {record.get('id')} has no reviewed_at date")
        reviewed_at = str(record.get("reviewed_at", ""))
        if reviewed_at:
            try:
                date.fromisoformat(reviewed_at)
            except ValueError:
                fail(errors, f"resource {record.get('id')} has an invalid reviewed_at date")
        url = str(record.get("url", ""))
        if not url.startswith("https://"):
            fail(errors, f"resource {record.get('id')} must use an https URL")

    partners = loaded.get("partners.json", [])
    for record in partners if isinstance(partners, list) else []:
        reviewed_at = str(record.get("reviewed_at", ""))
        if record.get("published", True) and not reviewed_at:
            fail(errors, f"partner {record.get('id')} has no reviewed_at date")
        if reviewed_at:
            try:
                date.fromisoformat(reviewed_at)
            except ValueError:
                fail(errors, f"partner {record.get('id')} has an invalid reviewed_at date")

    credits = loaded.get("photo_credits.json", [])
    credit_map = {item.get("file"): item for item in credits if isinstance(item, dict)}
    used = set()
    pattern = re.compile(r"assets/images/photos/[A-Za-z0-9_.-]+")
    for root in [APP / "pages", CONTENT]:
        for path in root.rglob("*"):
            if path.is_file() and path.suffix in {".astro", ".json"} and path.name != "photo_credits.json":
                used.update(pattern.findall(path.read_text(encoding="utf-8")))
    for image_path in sorted(used):
        credit = credit_map.get(image_path)
        if not credit:
            fail(errors, f"used photograph has no license record: {image_path}")
            continue
        is_unsplash = credit.get("license") == "Unsplash License" and str(credit.get("source", "")).startswith("https://unsplash.com/")
        is_generated = credit.get("license") == "Generated project asset" and "OpenAI image generation" in str(credit.get("source", ""))
        if not is_unsplash and not is_generated:
            fail(errors, f"photograph credit is incomplete: {image_path}")
        if credit.get("depicts_identifiable_people"):
            fail(errors, f"founding site should not imply stock people are society members: {image_path}")


def check_source(errors: list[str]) -> None:
    source_text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in sorted((APP / "scripts").glob("*.ts")))
    public_source_paths = [*APP.rglob("*.astro"), *APP.rglob("*.ts")]
    for path in sorted(public_source_paths):
        source = path.read_text(encoding="utf-8", errors="ignore")
        for pattern, description in PROHIBITED_CONTENT_PATTERNS.items():
            if re.search(pattern, source, re.IGNORECASE):
                fail(errors, f"{path.relative_to(ROOT)} contains {description}")
    if "/api/submit" not in source_text:
        fail(errors, "public forms are not routed through /api/submit")
    if "serviceWorker.register" not in source_text:
        fail(errors, "the generated offline worker is never registered")
    if re.search(r"from\(['\"]submissions['\"]\).*insert", source_text, re.S):
        fail(errors, "browser source still inserts directly into submissions")

    submit = (ROOT / "api/submit.js").read_text(encoding="utf-8")
    for required in ["accept_public_submission", "started_at", "company", "ipHash", "16 * 1024"]:
        if required not in submit:
            fail(errors, f"api/submit.js is missing expected protection: {required}")

    migration = (ROOT / "database/migrations/2026-08-07-complete-site.sql").read_text(encoding="utf-8").lower()
    for required in [
        "accept_public_submission", "allow_account_email", "accept_officer_invitation",
        "revoke_officer_invitation", "revoke insert on public.submissions",
        "grant execute", "pg_advisory_xact_lock", "for update",
    ]:
        if required not in migration:
            fail(errors, f"database migration is missing: {required}")

    members = (ROOT / "api/members.js").read_text(encoding="utf-8")
    for required in [
        "missingSchemaFeature", "localAccountEmailLimit", "society_role_id",
        "acceptInvitation", "revokeInvitation", "status=eq.sent",
    ]:
        if required not in members:
            fail(errors, f"api/members.js is missing cutover compatibility: {required}")

    runtime = (SITE / "assets/js/runtime-config.js").read_text(encoding="utf-8")
    # The portal may be enabled once the database migrations are in. What must
    # never ship is a half-configured one, so the guard now checks coherence
    # rather than forbidding the cutover outright: if the portal is on, it needs
    # a Supabase URL and key, and database-backed content needs the portal.
    portal_on = '"portalEnabled":true' in runtime
    database_on = '"useDatabase":true' in runtime
    has_url = '"supabaseUrl":""' not in runtime
    has_key = '"supabaseAnonKey":""' not in runtime

    if portal_on and not (has_url and has_key):
        fail(errors, "the officer portal is enabled but Supabase credentials are missing from the build")
    if database_on and not portal_on:
        fail(errors, "database-backed content is enabled without the officer portal")
    if not portal_on and (has_url or has_key):
        fail(errors, "Supabase credentials are baked in while the portal is disabled")
    for forbidden in ["service_role", "resend", "submission_salt"]:
        if forbidden in runtime.lower():
            fail(errors, f"public runtime config exposes a server-only value: {forbidden}")


def check_javascript(errors: list[str]) -> None:
    paths = list((ROOT / "api").glob("*.js")) + list((SITE / "assets").rglob("*.js")) + [ROOT / "middleware.js"]
    for path in paths:
        result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
        if result.returncode:
            fail(errors, f"JavaScript syntax error in {path.relative_to(ROOT)}: {result.stderr.strip()}")


def main() -> int:
    errors: list[str] = []
    if not SITE.exists():
        print("site/ does not exist. Run npm run build first.", file=sys.stderr)
        return 1
    check_html(errors)
    check_json(errors)
    check_source(errors)
    check_javascript(errors)
    if errors:
        print(f"Release validation failed with {len(errors)} problem(s):", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1
    print(f"Release validation passed: {len(EXPECTED_PAGES)} pages, content data, forms, licenses, APIs, and JavaScript checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
