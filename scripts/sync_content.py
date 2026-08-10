#!/usr/bin/env python3
"""Refresh the bundled content/*.json from the live database.

These files are the fallback the public site uses when Supabase is unreachable,
so they are supposed to mirror it. They drift instead: an officer edits a record
in the portal, the database changes, and the bundled copy keeps whatever it had
at the last commit. A visitor who hits the fallback then sees a version of the
site that stopped being true weeks ago -- deleted people still listed, uploaded
photographs missing -- with nothing to indicate the content is stale.

Run this after portal edits, or before a release, to bring them back in step.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

# Only tables the portal actually edits, and whose database schema carries
# every field the bundled file needs. partner_schools is deliberately absent:
# its table has no reviewed_at column, so syncing from the database would strip
# the "checked on" dates the resources rules require and the cards display.
TABLES = {
    "leaders": "leaders.json",
    "projects": "projects.json",
    "project_updates": "project_updates.json",
    "events": "events.json",
    "news_posts": "news.json",
    "sponsors": "sponsors.json",
}

# Columns the browser never reads, or that would leak edit history into a
# public file.
DROP = {"created_at", "updated_at", "auth_user_id", "uploaded_by", "invited_by"}


def fetch(base: str, key: str, table: str) -> list[dict]:
    request = urllib.request.Request(
        f"{base}/rest/v1/{table}?select=*&published=eq.true",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_KEY") or ""
    if not base or not key:
        print("SUPABASE_URL and SUPABASE_ANON_KEY are required.", file=sys.stderr)
        return 1

    changed = 0
    for table, filename in TABLES.items():
        path = CONTENT / filename
        try:
            rows = fetch(base, key, table)
        except urllib.error.HTTPError as error:
            print(f"  {table:18} skipped ({error.code})")
            continue
        cleaned = [{k: v for k, v in row.items() if k not in DROP} for row in rows]
        cleaned.sort(key=lambda row: (row.get("sort_order") if isinstance(row.get("sort_order"), int) else 999,
                                      str(row.get("title") or row.get("name") or row.get("id") or "")))
        text = json.dumps(cleaned, indent=2, ensure_ascii=False) + "\n"
        before = path.read_text(encoding="utf-8") if path.exists() else ""
        if text != before:
            path.write_text(text, encoding="utf-8")
            changed += 1
            print(f"  {table:18} updated ({len(cleaned)} rows)")
        else:
            print(f"  {table:18} already in step ({len(cleaned)} rows)")
    print(f"\n{changed} file(s) refreshed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
