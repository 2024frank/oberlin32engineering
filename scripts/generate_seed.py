#!/usr/bin/env python3
"""Generate idempotent Supabase seed SQL from versioned content JSON."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
OUTPUT = ROOT / "database" / "seed.sql"

TABLES: dict[str, tuple[str, list[str], set[str]]] = {
    "projects": ("projects.json", ["id","slug","title","kicker","summary","description","category","status","year","progress","featured","published","skills","open_roles","team_names","accent","cover_url","impact","project_url","github_url","sort_order"], set()),
    "project_updates": ("project_updates.json", ["id","project_id","title","summary","body","milestone","published_at","image_url","published"], {"published_at"}),
    "leaders": ("leaders.json", ["id","name","role","term","class_year","major","bio","expected_time","photo_url","linkedin_url","email","current","advisor","open_seat","published","sort_order"], set()),
    "events": ("events.json", ["id","slug","title","summary","description","event_type","status","date_label","start_at","end_at","location","registration_url","cover_url","featured","published"], {"start_at","end_at"}),
    "resources": ("resources.json", ["id","title","description","category","source","url","reviewed_at","pinned","published","sort_order"], {"reviewed_at"}),
    "opportunities": ("opportunities.json", ["id","title","organization","type","description","deadline_label","deadline","location","url","featured","published"], {"deadline"}),
    "news_posts": ("news.json", ["id","slug","title","excerpt","body","author","published_at","cover_url","featured","published"], {"published_at"}),
    "competition_editions": ("competition.json", ["id","year","title","eyebrow","theme","tagline","description","status","season","registration_open","registration_deadline","event_date","venue","hero_url","prize_pool","rules_url","results_published","published","tracks","stages","criteria"], {"registration_deadline","event_date"}),
    "sponsors": ("sponsors.json", ["id","name","tier","logo_url","url","description","active","published","sort_order"], set()),
    "partner_schools": ("partners.json", ["id","name","short_name","location","region_code","url","description","questions","published","sort_order"], set()),
    "impact": ("impact.json", ["id","founded","current_term","operating_stage","public_metrics","milestones","reports","published"], set()),
    "documents": ("documents.json", ["id","title","category","description","url","format","published","sort_order"], set()),
}


def quote(value: object, nullable: bool = False) -> str:
    if value is None or (nullable and value == ""):
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, dict)):
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("'", "''")
        return f"'{raw}'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


def upsert(table: str, rows: list[dict], columns: list[str], nullable: set[str]) -> str:
    values = ["(" + ", ".join(quote(row.get(column), column in nullable) for column in columns) + ")" for row in rows]
    updates = [column for column in columns if column != "id"]
    assignments = ",\n  ".join(f"{column} = excluded.{column}" for column in updates)
    return f"""insert into public.{table} ({', '.join(columns)}) values
  {',\n  '.join(values)}
on conflict (id) do update set
  {assignments};
"""


def main() -> None:
    blocks = [
        "-- Versioned public content for the Oberlin 3-2 Engineering Society\n-- Run after schema.sql, members.sql, and migrations/2026-08-07-complete-site.sql. Re-running is safe.\n"
    ]
    site = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
    blocks.append("insert into public.site_settings (id, settings, published) values " + f"('main', {quote(site)}, true) on conflict (id) do update set settings = excluded.settings, published = true;\n")
    for table, (filename, columns, nullable) in TABLES.items():
        data = json.loads((CONTENT / filename).read_text(encoding="utf-8"))
        if table == "impact":
            records = [{"id": "main", **data, "published": True}]
        elif isinstance(data, list):
            records = data
        else:
            records = [data]
        if records:
            blocks.append(upsert(table, records, columns, nullable))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(blocks), encoding="utf-8")
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
