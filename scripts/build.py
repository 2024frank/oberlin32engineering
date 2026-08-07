#!/usr/bin/env python3
"""Build the Oberlin 3-2 Engineering Society static website.

The project intentionally uses only the Python standard library so future
student leaders can rebuild the site without installing a framework.
"""

from __future__ import annotations

import json
import shutil
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
SITE = ROOT / "site"


def load_json(name: str):
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


CONFIG = load_json("site.json")
PROJECTS = load_json("projects.json")
EVENTS = load_json("events.json")
RESOURCES = load_json("resources.json")

DOMAIN = CONFIG["domain"].rstrip("/")
JOIN_URL = CONFIG["join_url"]
INSTAGRAM_URL = CONFIG["instagram_url"]
CONTACT_EMAIL = CONFIG["contact_email"]


ICONS = {
    "arrow": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    "external": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    "menu": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    "close": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    "users": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    "book": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    "tool": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5-5L7.4 3.6l3 3 2.3-2.3a4 4 0 0 0 2 2Z"/><path d="m5 13-3 3 6 6 3-3"/><path d="m8 16 6.3-6.3"/><path d="m16 8 6 6-3 3-6-6"/></svg>',
    "mic": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>',
    "network": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="6" rx="2"/><rect x="2" y="16" width="8" height="6" rx="2"/><rect x="14" y="16" width="8" height="6" rx="2"/><path d="M12 8v4M6 16v-2h12v2"/></svg>',
    "spark": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z"/><path d="m5 3-.7 1.8L2.5 5.5l1.8.7L5 8l.7-1.8 1.8-.7-1.8-.7L5 3ZM19 16l-.9 2.1L16 19l2.1.9L19 22l.9-2.1L22 19l-2.1-.9L19 16Z"/></svg>',
    "calendar": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    "mail": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    "instagram": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg>',
    "map": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    "code": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>',
    "cpu": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>',
    "bolt": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></svg>',
    "layers": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/></svg>',
    "shield": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    "target": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    "heart": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    "check": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>',
    "search": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    "download": '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
}


def icon(name: str) -> str:
    return ICONS[name]


def brand(compact: bool = False) -> str:
    compact_class = " compact" if compact else ""
    return f'''<span class="brand-mark{compact_class}"><img src="assets/images/logo-mark.svg" alt=""></span>
      <span class="brand-copy">
        <span class="brand-main">Oberlin <strong>3-2</strong></span>
        <span class="brand-sub">Engineering Society</span>
      </span>'''


def header(active: str) -> str:
    nav = [
        ("about.html", "About", "about"),
        ("programs.html", "Programs", "programs"),
        ("projects.html", "Projects", "projects"),
        ("resources.html", "Resources", "resources"),
        ("events.html", "Events", "events"),
    ]
    desktop = "".join(
        f'<a href="{href}"{(" aria-current=\"page\"" if key == active else "")}>{label}</a>'
        for href, label, key in nav
    )
    mobile = "".join(
        f'<a href="{href}"{(" aria-current=\"page\"" if key == active else "")}>{label}<span>0{i}</span></a>'
        for i, (href, label, key) in enumerate(nav, 1)
    )
    return f'''
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="announcement" role="status">
  <div class="shell announcement-inner">
    <span class="announcement-dot" aria-hidden="true"></span>
    <span>Founding members and student leaders wanted for {CONFIG['launch_term']}.</span>
    <a href="{JOIN_URL}" target="_blank" rel="noopener">Choose your role {icon('arrow')}</a>
  </div>
</div>
<header class="site-header" data-site-header>
  <div class="shell nav-shell">
    <a class="brand" href="index.html" aria-label="{escape(CONFIG['name'])} home">{brand()}</a>
    <nav class="desktop-nav" aria-label="Primary navigation">{desktop}</nav>
    <div class="nav-actions">
      <a class="nav-instagram" href="{INSTAGRAM_URL}" target="_blank" rel="noopener" aria-label="Instagram">{icon('instagram')}</a>
      <a class="button button-small button-primary" href="join.html">Join the society {icon('arrow')}</a>
      <button class="menu-button" type="button" data-menu-open aria-label="Open menu" aria-controls="mobile-menu" aria-expanded="false">{icon('menu')}</button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu" data-mobile-menu aria-hidden="true">
  <div class="mobile-menu-head">
    <a class="brand" href="index.html" aria-label="{escape(CONFIG['name'])} home">{brand(compact=True)}</a>
    <button class="menu-close" type="button" data-menu-close aria-label="Close menu">{icon('close')}</button>
  </div>
  <nav class="mobile-nav" aria-label="Mobile navigation">{mobile}<a href="join.html"{(" aria-current=\"page\"" if active == "join" else "")}>Join<span>06</span></a></nav>
  <div class="mobile-menu-foot">
    <p>Think across disciplines. Build beyond them.</p>
    <a class="button button-gold" href="{JOIN_URL}" target="_blank" rel="noopener">Open the interest form {icon('external')}</a>
  </div>
</div>
'''


def footer() -> str:
    return f'''
<footer class="site-footer">
  <div class="shell footer-grid">
    <div class="footer-intro">
      <a class="brand footer-brand" href="index.html" aria-label="{escape(CONFIG['name'])} home">{brand()}</a>
      <p>{escape(CONFIG['description'])}</p>
      <div class="footer-socials">
        <a href="{INSTAGRAM_URL}" target="_blank" rel="noopener">{icon('instagram')} Instagram</a>
        <a href="mailto:{CONTACT_EMAIL}">{icon('mail')} Email</a>
      </div>
    </div>
    <div class="footer-column">
      <strong>Society</strong>
      <a href="about.html">About</a>
      <a href="programs.html">Programs</a>
      <a href="projects.html">Projects</a>
      <a href="events.html">Events</a>
    </div>
    <div class="footer-column">
      <strong>Get involved</strong>
      <a href="join.html">Membership and roles</a>
      <a href="{JOIN_URL}" target="_blank" rel="noopener">Founding member form</a>
      <a href="contact.html">Contact and partnerships</a>
      <a href="resources.html">Resource library</a>
    </div>
    <div class="footer-column">
      <strong>Official sources</strong>
      <a href="https://www.oberlin.edu/arts-and-sciences/departments/engineering" target="_blank" rel="noopener">Oberlin 3-2 Program</a>
      <a href="https://www.oberlin.edu/aarc/advising-guides-major/3-2-engineering-program" target="_blank" rel="noopener">3-2 advising guide</a>
      <a href="https://www.oberlin.edu/career" target="_blank" rel="noopener">Career Exploration</a>
      <a href="https://www.oberlin.edu/student-involvement/student-organizations-contact-list" target="_blank" rel="noopener">Student Involvement</a>
    </div>
  </div>
  <div class="shell footer-bottom">
    <p>© <span data-current-year></span> {escape(CONFIG['name'])}. {escape(CONFIG['status'])}.</p>
    <div><a href="privacy.html">Privacy</a><span>Not an official Oberlin College website.</span></div>
  </div>
</footer>
<div class="scroll-progress" data-scroll-progress aria-hidden="true"></div>
<script src="assets/js/main.js" defer></script>
'''


def page_head(title: str, description: str, filename: str, schema: str = "") -> str:
    canonical = f"{DOMAIN}/" if filename == "index.html" else f"{DOMAIN}/{filename}"
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>document.documentElement.classList.add('js')</script>
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(description)}">
  <meta name="theme-color" content="#11110f">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="{canonical}">
  <link rel="icon" href="assets/images/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="assets/images/icon-192.png">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="preload" href="assets/css/styles.css" as="style">
  <link rel="stylesheet" href="assets/css/styles.css">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{escape(CONFIG['name'])}">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{escape(description)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{DOMAIN}/assets/images/og-cover.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(title)}">
  <meta name="twitter:description" content="{escape(description)}">
  <meta name="twitter:image" content="{DOMAIN}/assets/images/og-cover.png">
  {schema}
</head>'''


def layout(filename: str, title: str, description: str, active: str, content: str, schema: str = "", body_class: str = "") -> str:
    return f'''{page_head(title, description, filename, schema)}
<body class="{escape(body_class)}">
{header(active)}
{content}
{footer()}
</body>
</html>
'''


def section_heading(eyebrow: str, title: str, text: str = "", align: str = "") -> str:
    return f'''<div class="section-heading {align}">
      <span class="eyebrow">{escape(eyebrow)}</span>
      <h2>{title}</h2>
      {f'<p>{text}</p>' if text else ''}
    </div>'''


def page_hero(kicker: str, title: str, text: str, meta: str = "") -> str:
    return f'''<section class="page-hero">
  <canvas class="page-hero-canvas" data-engineering-field data-density="low" aria-hidden="true"></canvas>
  <div class="page-hero-grid" aria-hidden="true"></div>
  <div class="shell page-hero-inner reveal">
    <span class="eyebrow eyebrow-light">{escape(kicker)}</span>
    <h1>{title}</h1>
    <p>{text}</p>
    {f'<div class="page-hero-meta">{meta}</div>' if meta else ''}
  </div>
</section>'''


def project_card(project: dict, home: bool = False) -> str:
    skills = "".join(f"<span>{escape(skill)}</span>" for skill in project["skills"])
    size_class = " project-card-home" if home else ""
    return f'''<article class="project-card{size_class} tilt-card reveal" data-project-card data-category="{escape(project['category'])}">
  <div class="project-card-top">
    <span class="project-status">{escape(project['status'])}</span>
    <span class="project-index">{escape(project['category']).upper()}</span>
  </div>
  <div class="project-schematic" aria-hidden="true">
    <span class="schematic-node node-a"></span><span class="schematic-node node-b"></span><span class="schematic-node node-c"></span>
    <span class="schematic-line line-a"></span><span class="schematic-line line-b"></span>
    <span class="schematic-core">{icon('cpu')}</span>
  </div>
  <p class="project-discipline">{escape(project['discipline'])}</p>
  <h3>{escape(project['title'])}</h3>
  <p>{escape(project['summary'])}</p>
  <div class="project-skills">{skills}</div>
  <div class="project-challenge"><strong>Design question</strong><span>{escape(project['challenge'])}</span></div>
</article>'''


def home_page() -> str:
    org_schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": CONFIG["name"],
        "url": f"{DOMAIN}/",
        "logo": f"{DOMAIN}/assets/images/logo-mark.svg",
        "description": CONFIG["description"],
        "foundingDate": "2026",
        "email": CONTACT_EMAIL,
        "sameAs": [INSTAGRAM_URL],
    }, indent=2)
    schema = f'<script type="application/ld+json">{org_schema}</script>'
    featured_projects = "".join(project_card(project, True) for project in PROJECTS[:3])
    event_preview = "".join(
        f'''<article class="launch-step reveal"><span class="launch-phase">{escape(e['phase'])}</span><div><small>{escape(e['timing'])}</small><h3>{escape(e['title'])}</h3><p>{escape(e['description'])}</p></div><span class="status-pill">{escape(e['status'])}</span></article>'''
        for e in EVENTS[:4]
    )
    content = f'''
<main id="main-content">
  <section class="home-hero">
    <canvas class="hero-canvas" data-engineering-field aria-hidden="true"></canvas>
    <div class="hero-grid-overlay" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-one" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-two" aria-hidden="true"></div>
    <div class="shell home-hero-grid">
      <div class="hero-copy reveal">
        <span class="system-label"><span></span> Oberlin College · {escape(CONFIG['status'])}</span>
        <h1>Engineering has a home at <em>Oberlin.</em></h1>
        <p class="hero-lead">We are bringing current and prospective 3-2 students into one community for practical guidance, ambitious projects, shared resources, and the people who make the path feel possible.</p>
        <div class="hero-actions">
          <a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Become a founding member {icon('arrow')}</a>
          <a class="button button-ghost button-large" href="projects.html">Explore the build lab {icon('arrow')}</a>
        </div>
        <div class="hero-proof">
          <div><strong>Open</strong><span>to every Oberlin student</span></div>
          <div><strong>Interdisciplinary</strong><span>hardware, software, design, and more</span></div>
          <div><strong>Launching</strong><span>{escape(CONFIG['launch_term'])}</span></div>
        </div>
      </div>
      <div class="hero-system reveal" data-tilt-root>
        <div class="system-window">
          <div class="system-window-bar"><span></span><span></span><span></span><small>OBERLIN // ENGINEERING NETWORK</small></div>
          <div class="system-stage">
            <svg class="system-paths" viewBox="0 0 700 620" aria-hidden="true">
              <path class="path-dim" d="M110 128 C220 140 250 220 350 305"/>
              <path class="path-dim" d="M116 310 C230 310 258 310 350 305"/>
              <path class="path-dim" d="M120 500 C224 460 262 384 350 305"/>
              <path class="path-dim" d="M350 305 C444 232 480 170 590 128"/>
              <path class="path-dim" d="M350 305 C456 350 486 446 590 500"/>
              <path class="path-pulse pulse-one" d="M110 128 C220 140 250 220 350 305"/>
              <path class="path-pulse pulse-two" d="M116 310 C230 310 258 310 350 305"/>
              <path class="path-pulse pulse-three" d="M120 500 C224 460 262 384 350 305"/>
              <path class="path-pulse pulse-four" d="M350 305 C444 232 480 170 590 128"/>
              <path class="path-pulse pulse-five" d="M350 305 C456 350 486 446 590 500"/>
            </svg>
            <div class="system-node node-1"><span>01</span><strong>SCIENCE</strong><small>foundations</small></div>
            <div class="system-node node-2"><span>02</span><strong>LIBERAL ARTS</strong><small>perspective</small></div>
            <div class="system-node node-3"><span>03</span><strong>COMMUNITY</strong><small>collaboration</small></div>
            <div class="system-node node-4"><span>04</span><strong>ENGINEERING</strong><small>depth</small></div>
            <div class="system-node node-5"><span>05</span><strong>IMPACT</strong><small>application</small></div>
            <div class="system-core">
              <div class="core-orbit orbit-one"></div><div class="core-orbit orbit-two"></div>
              <div class="core-gear"><img src="assets/images/logo-mark.svg" alt=""></div>
              <div class="core-label"><strong>3 <span>+</span> 2</strong><small>ONE CONNECTED PATH</small></div>
            </div>
          </div>
          <div class="system-console">
            <span><i class="console-live"></i> NETWORK READY</span>
            <span data-signal-readout>CONNECT / PREPARE / BUILD</span>
            <span>FALL_2026</span>
          </div>
        </div>
      </div>
    </div>
    <a class="hero-scroll" href="#mission"><span>Scroll to explore</span><i></i></a>
  </section>

  <section class="discipline-rail" aria-label="Engineering interests">
    <div class="discipline-track">
      <span>Electrical engineering</span><i></i><span>Mechanical systems</span><i></i><span>Robotics</span><i></i><span>Computer engineering</span><i></i><span>Environmental design</span><i></i><span>Artificial intelligence</span><i></i><span>Biomedical systems</span><i></i><span>Product design</span><i></i>
      <span aria-hidden="true">Electrical engineering</span><i aria-hidden="true"></i><span aria-hidden="true">Mechanical systems</span><i aria-hidden="true"></i><span aria-hidden="true">Robotics</span><i aria-hidden="true"></i><span aria-hidden="true">Computer engineering</span><i aria-hidden="true"></i><span aria-hidden="true">Environmental design</span><i aria-hidden="true"></i><span aria-hidden="true">Artificial intelligence</span><i aria-hidden="true"></i><span aria-hidden="true">Biomedical systems</span><i aria-hidden="true"></i><span aria-hidden="true">Product design</span><i aria-hidden="true"></i>
    </div>
  </section>

  <section class="section mission-section" id="mission">
    <div class="shell">
      {section_heading('Why this society', 'Talent is everywhere.<br><span>Connection is not.</span>', 'Oberlin students interested in engineering are spread across departments, courses, class years, and career directions. The society creates the shared structure that has been missing.')}
      <div class="mission-grid">
        <article class="mission-card reveal"><span class="mission-number">01</span><div class="icon-box">{icon('users')}</div><h3>Find your people</h3><p>Meet students who understand the 3-2 path, share your technical interests, or bring a perspective your project needs.</p><a href="join.html">Enter the community {icon('arrow')}</a></article>
        <article class="mission-card reveal"><span class="mission-number">02</span><div class="icon-box">{icon('book')}</div><h3>Keep knowledge moving</h3><p>Turn course planning, partner-school experience, application lessons, and internship advice into resources the next cohort can use.</p><a href="resources.html">Open the resource hub {icon('arrow')}</a></article>
        <article class="mission-card reveal"><span class="mission-number">03</span><div class="icon-box">{icon('tool')}</div><h3>Build something real</h3><p>Form interdisciplinary teams, define a problem, seek funding, prototype carefully, and finish work worth demonstrating.</p><a href="projects.html">Visit the build lab {icon('arrow')}</a></article>
      </div>
    </div>
  </section>

  <section class="section pathway-section">
    <div class="shell pathway-layout">
      <div class="pathway-copy reveal">
        <span class="eyebrow eyebrow-light">The 3-2 pathway</span>
        <h2>Two schools.<br>One connected path.<br><span>An intentional education.</span></h2>
        <p>Students typically spend three years building a liberal arts and science foundation at Oberlin, then two years completing engineering study at a partner institution. Students pursue an Oberlin BA and an engineering degree awarded under the partner institution’s current requirements.</p>
        <p class="source-note">Program details and requirements can change. Always confirm academic decisions with official Oberlin resources and your advisor.</p>
        <a class="button button-outline-light" href="resources.html">See official planning links {icon('arrow')}</a>
      </div>
      <div class="pathway-machine reveal" data-pathway-machine>
        <div class="pathway-stage stage-three">
          <div class="stage-number" data-counter="3">3</div>
          <div><small>YEARS 01–03</small><h3>Oberlin College</h3><p>Science, mathematics, communication, ethics, creativity, and intellectual range.</p><div class="tag-row"><span>Liberal arts</span><span>STEM foundation</span><span>Community</span></div></div>
        </div>
        <div class="pathway-transfer" aria-hidden="true"><span></span><strong>TRANSFER</strong><span></span></div>
        <div class="pathway-stage stage-two">
          <div class="stage-number" data-counter="2">2</div>
          <div><small>YEARS 04–05</small><h3>Engineering partner</h3><p>Focused professional engineering coursework and discipline-specific depth.</p><div class="tag-row"><span>Caltech</span><span>Case Western</span><span>Columbia</span><span>WashU</span></div></div>
        </div>
        <div class="degree-output"><span>{icon('layers')}</span><div><small>OUTPUT</small><strong>BA + ENGINEERING</strong><p>Degree titles and requirements vary by partner institution.</p></div></div>
      </div>
    </div>
  </section>

  <section class="section programs-preview">
    <div class="shell">
      <div class="heading-row">
        {section_heading('What we are building', 'A society that does more than meet.', 'Every program should create a clear result: a useful connection, a better decision, a practical skill, or finished work members can show.')}
        <a class="text-link" href="programs.html">View every program {icon('arrow')}</a>
      </div>
      <div class="program-grid">
        <article class="program-card program-card-wide reveal"><span class="program-code">BUILD.01</span><div class="icon-box dark">{icon('tool')}</div><h3>Project incubator</h3><p>Pitch a problem, form a team, receive scope and design feedback, request materials, and work toward a public demonstration.</p><a href="projects.html">See the build process {icon('arrow')}</a><div class="program-signal" aria-hidden="true"><span></span><span></span><span></span></div></article>
        <article class="program-card reveal"><span class="program-code">CONNECT.02</span><div class="icon-box">{icon('network')}</div><h3>Peer network</h3><p>Mentors, study partners, collaborators, and people who understand the choices ahead.</p></article>
        <article class="program-card reveal"><span class="program-code">LEARN.03</span><div class="icon-box">{icon('mic')}</div><h3>Panels and workshops</h3><p>Practical conversations with students, alumni, faculty, professionals, and partner institutions.</p></article>
        <article class="program-card reveal"><span class="program-code">PREPARE.04</span><div class="icon-box">{icon('book')}</div><h3>Living resource hub</h3><p>Course planning, transition knowledge, opportunities, templates, and lessons preserved over time.</p></article>
        <article class="program-card reveal"><span class="program-code">BELONG.05</span><div class="icon-box">{icon('heart')}</div><h3>Community nights</h3><p>Low-pressure conversation, food, idea exchange, and the friendships that make difficult work sustainable.</p></article>
      </div>
    </div>
  </section>

  <section class="section project-preview-section">
    <div class="shell">
      <div class="heading-row heading-row-light">
        {section_heading('Build lab', 'Start with a real problem.<br><span>Finish with evidence.</span>', 'These are possible project directions, not promises. Founding members will choose what matters, what is feasible, and what the first teams can complete well.')}
        <a class="button button-outline-light" href="projects.html">Explore every project direction {icon('arrow')}</a>
      </div>
      <div class="project-grid home-project-grid">{featured_projects}</div>
    </div>
  </section>

  <section class="section launch-section">
    <div class="shell launch-layout">
      <div class="launch-copy reveal">
        <span class="eyebrow">Fall 2026 launch sequence</span>
        <h2>Build the club<br>like an engineering system.</h2>
        <p>Define the need. Recruit a reliable team. Test the plan. Document decisions. Improve the next iteration.</p>
        <a class="button button-primary" href="events.html">See the launch plan {icon('arrow')}</a>
      </div>
      <div class="launch-list">{event_preview}</div>
    </div>
  </section>

  <section class="section resource-callout">
    <div class="shell resource-callout-grid">
      <div class="resource-console reveal" aria-hidden="true">
        <div class="console-title"><span></span><span></span><span></span><small>RESOURCE_HUB / INDEX</small></div>
        <div class="console-lines"><p><span>01</span> PROGRAM OVERVIEW <i>VERIFIED</i></p><p><span>02</span> ADVISING GUIDE <i>VERIFIED</i></p><p><span>03</span> ACADEMIC CALENDAR <i>LIVE</i></p><p><span>04</span> CAREER SUPPORT <i>LIVE</i></p><p><span>05</span> PARTNER INSTITUTIONS <i>LINKED</i></p></div>
        <div class="console-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="resource-callout-copy reveal">
        <span class="eyebrow">Resources that survive graduation</span>
        <h2>Stop rebuilding the same knowledge from zero.</h2>
        <p>The resource hub begins with official Oberlin information and grows through carefully documented student experience. Future cohorts should inherit better maps than the ones we started with.</p>
        <div class="check-list"><span>{icon('check')} Official 3-2 links</span><span>{icon('check')} Planning and transition guides</span><span>{icon('check')} Career and research opportunities</span><span>{icon('check')} Project documentation</span></div>
        <a class="button button-primary" href="resources.html">Open the resource library {icon('arrow')}</a>
      </div>
    </div>
  </section>

  <section class="final-cta">
    <canvas data-engineering-field data-density="low" aria-hidden="true"></canvas>
    <div class="shell final-cta-inner reveal">
      <img src="assets/images/logo-mark.svg" alt="" class="cta-logo">
      <span class="eyebrow eyebrow-light">Your seat is not preassigned</span>
      <h2>Help decide what engineering<br>at Oberlin can become.</h2>
      <p>Join as a founding member, student leader, project builder, event organizer, or general member. Experience is welcome. Curiosity and reliability matter more.</p>
      <div class="hero-actions centered"><a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Choose how you want to help {icon('external')}</a><a class="button button-ghost button-large" href="about.html">Read our full mission {icon('arrow')}</a></div>
    </div>
  </section>
</main>
'''
    return layout(
        "index.html",
        "Oberlin 3-2 Engineering Society | Engineering Has a Home at Oberlin",
        "Connect with engineering-minded students at Oberlin, explore the 3-2 pathway, join projects, find resources, and help build the society from the beginning.",
        "home",
        content,
        schema,
        "home-page",
    )


def about_page() -> str:
    content = f'''
<main id="main-content">
  {page_hero('About the society', 'A home for engineering<br><span>at Oberlin.</span>', 'We are building a durable student community for people who want to understand engineering, pursue the 3-2 pathway, create useful work, and help one another move forward.', '<span>CONNECT</span><span>PREPARE</span><span>BUILD</span>')}

  <section class="section story-section">
    <div class="shell story-grid">
      <div class="story-sticky reveal"><span class="eyebrow">The reason we exist</span><h2>The problem is not a lack of talent.</h2><p>It is fragmentation.</p></div>
      <div class="story-copy reveal">
        <p class="large-copy">Engineering-minded students at Oberlin can sit in the same physics lecture, work in adjacent labs, or dream about similar futures without ever realizing they should know one another.</p>
        <p>Current and prospective 3-2 students move through several departments. Older students leave for engineering schools just as their experience becomes most valuable. Project ideas appear, but teams, materials, continuity, and visibility can be difficult to assemble.</p>
        <p>The Oberlin 3-2 Engineering Society is designed to connect those pieces. It gives students a shared identity, a reliable place to find guidance, a structure for building, and a way to pass knowledge forward.</p>
        <div class="story-quote"><span>Our operating question</span><blockquote>What can we create together that none of us could build alone?</blockquote></div>
      </div>
    </div>
  </section>

  <section class="section mission-vision-section">
    <div class="shell mission-vision-grid">
      <article class="statement-card reveal"><span>MISSION</span><h2>Connect students. Clarify the path. Build real things.</h2><p>Bring current and prospective 3-2 students together, connect them with resources and people, and create opportunities to practice engineering through interdisciplinary work.</p></article>
      <article class="statement-card statement-card-dark reveal"><span>VISION</span><h2>A lasting engineering culture within Oberlin's liberal arts community.</h2><p>Future students should arrive to an existing network, inherit useful knowledge, find collaborators quickly, and see engineering as part of Oberlin rather than something that begins only after leaving.</p></article>
    </div>
  </section>

  <section class="section principles-section">
    <div class="shell">
      {section_heading('How we will work', 'Principles before programming.', 'A good club is not measured by how many ideas it announces. It is measured by whether people trust it, learn through it, and finish meaningful work.')}
      <div class="principle-grid">
        <article class="principle-card reveal"><span>01</span><div>{icon('users')}</div><h3>Open by design</h3><p>Membership is open to every Oberlin student interested in engineering, design, technology, innovation, or building.</p></article>
        <article class="principle-card reveal"><span>02</span><div>{icon('target')}</div><h3>Useful outcomes</h3><p>Events and projects should create a clear result, not simply fill a calendar.</p></article>
        <article class="principle-card reveal"><span>03</span><div>{icon('book')}</div><h3>Document the work</h3><p>Plans, budgets, failures, resources, and lessons should remain useful after current leaders leave.</p></article>
        <article class="principle-card reveal"><span>04</span><div>{icon('shield')}</div><h3>Build responsibly</h3><p>Safety, consent, accessibility, ethical judgment, and respect for community partners are part of engineering quality.</p></article>
        <article class="principle-card reveal"><span>05</span><div>{icon('tool')}</div><h3>Finish before expanding</h3><p>A few completed projects and well-run programs are better than a long list of abandoned promises.</p></article>
        <article class="principle-card reveal"><span>06</span><div>{icon('heart')}</div><h3>Make belonging practical</h3><p>People stay when they are welcomed, trusted with real responsibility, and able to see how they contribute.</p></article>
      </div>
    </div>
  </section>

  <section class="section structure-section">
    <div class="shell">
      <div class="heading-row heading-row-light">{section_heading('Founding structure', 'Small team. Clear ownership.', 'The launch structure stays intentionally lean. Roles can expand when there is enough consistent work to justify them.')}<a class="button button-outline-light" href="join.html">Explore open roles {icon('arrow')}</a></div>
      <div class="org-chart reveal">
        <div class="org-card org-card-lead"><span>FOUNDER / PRESIDENT</span><h3>{escape(CONFIG['founder'])}</h3><p>Direction, representation, coordination, and institutional relationships.</p></div>
        <div class="org-line vertical"></div>
        <div class="org-row">
          <div class="org-card"><span>ADVISOR</span><h3>{escape(CONFIG['advisor'])}</h3><p>Guidance, continuity, institutional context, and support.</p></div>
          <div class="org-card open"><span>OPEN ROLE</span><h3>Vice President</h3><p>Operations, meeting leadership, member support, and continuity.</p></div>
          <div class="org-card open"><span>OPEN ROLE</span><h3>Treasurer</h3><p>Budgeting, funding requests, purchasing, and financial records.</p></div>
          <div class="org-card open"><span>OPEN ROLE</span><h3>Projects Chair</h3><p>Project selection, team support, materials, design reviews, and documentation.</p></div>
          <div class="org-card open"><span>OPEN ROLE</span><h3>Programs and Outreach</h3><p>Panels, workshops, partnerships, communications, and recruitment.</p></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section governance-section">
    <div class="shell governance-grid">
      <div class="governance-copy reveal"><span class="eyebrow">Designed to last</span><h2>The society cannot depend on one person.</h2><p>Leadership transition is part of the system, not an emergency at the end of the year.</p></div>
      <div class="governance-list">
        <article class="reveal"><span>01</span><div><h3>Shared records</h3><p>Meeting notes, contacts, budgets, project files, and decisions live in organization-owned spaces.</p></div></article>
        <article class="reveal"><span>02</span><div><h3>Defined handoffs</h3><p>Every officer leaves a role guide, current priorities, recurring tasks, and a clear next action.</p></div></article>
        <article class="reveal"><span>03</span><div><h3>Student voice</h3><p>Members help choose projects, programming priorities, and improvements through structured feedback.</p></div></article>
        <article class="reveal"><span>04</span><div><h3>Truthful communication</h3><p>Plans, approvals, funding, and outcomes are described accurately. Proposed work is never presented as confirmed.</p></div></article>
      </div>
    </div>
  </section>

  <section class="final-cta compact-cta"><div class="shell final-cta-inner reveal"><span class="eyebrow eyebrow-light">Founding team</span><h2>Help build the culture<br>you wish already existed.</h2><p>Founding members will shape the charter, first events, first projects, and the way future students experience engineering at Oberlin.</p><a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Join the founding team {icon('external')}</a></div></section>
</main>
'''
    return layout("about.html", "About | Oberlin 3-2 Engineering Society", "Learn why the Oberlin 3-2 Engineering Society is being created, how it will operate, and the principles guiding its launch.", "about", content, body_class="about-page")


def programs_page() -> str:
    programs = [
        ("01", "Community nights", "Belong", "Twice monthly", "Pizza, introductions, honest conversation, and low-pressure ways to meet people across class years and disciplines.", "Members leave knowing at least one new person and one useful next step.", "users"),
        ("02", "3-2 peer network", "Navigate", "Semester-long", "Connect newer students with older students, alumni, or small mentor groups based on interests and the questions they are trying to answer.", "Knowledge moves between cohorts instead of disappearing when students transfer.", "network"),
        ("03", "Panels and workshops", "Prepare", "Monthly", "Bring together students, faculty, alumni, partner institutions, and professionals for practical conversations and skill-building.", "Members make better academic, career, and project decisions.", "mic"),
        ("04", "Project incubator", "Build", "Six to eight week cycles", "Select a manageable problem, assemble an interdisciplinary team, request materials, hold design reviews, test, and document.", "Teams finish work they can demonstrate, explain, and improve.", "tool"),
        ("05", "Living resource hub", "Preserve", "Continuously updated", "Collect official links, planning notes, transition advice, opportunity lists, templates, and lessons from students who have navigated the path.", "Future students begin with stronger information and fewer avoidable surprises.", "book"),
        ("06", "Engineering showcase", "Share", "End of semester", "Present prototypes, explain the problem, show evidence, discuss failures, and invite others to continue or adapt the work.", "The wider campus can see what engineering-minded students are learning and creating.", "spark"),
    ]
    cards = "".join(f'''<article class="program-detail reveal" id="program-{number}"><div class="program-detail-index">{number}</div><div class="program-detail-main"><span class="program-mode">{mode}</span><h2>{title}</h2><p>{description}</p><div class="program-detail-meta"><span><small>CADENCE</small>{cadence}</span><span><small>DESIGNED OUTCOME</small>{outcome}</span></div></div><div class="program-detail-icon">{icon(icon_name)}</div></article>''' for number, title, mode, cadence, description, outcome, icon_name in programs)
    content = f'''
<main id="main-content">
  {page_hero('Programs', 'Community with<br><span>a purpose.</span>', 'The society is designed around six programs. Each one answers a specific problem and produces a result members can feel, use, or show.', '<span>COMMUNITY</span><span>GUIDANCE</span><span>PROJECTS</span>')}
  <section class="section program-details-section"><div class="shell"><div class="program-details-intro">{section_heading('What members can expect', 'A club with an operating system.', 'Programs have a purpose, a cadence, an owner, and a designed outcome. That keeps the society active without becoming chaotic.')}</div><div class="program-detail-list">{cards}</div></div></section>

  <section class="section rhythm-section">
    <div class="shell rhythm-grid">
      <div class="rhythm-copy reveal"><span class="eyebrow eyebrow-light">A practical rhythm</span><h2>Enough activity to build momentum.<br><span>Enough space to do the work.</span></h2><p>The exact schedule will be decided with founding members, but the starting rhythm is intentionally realistic.</p></div>
      <div class="rhythm-calendar reveal">
        <div class="calendar-head"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
        <div class="calendar-body">
          <div></div><div class="calendar-event event-build"><small>WEEKLY</small><strong>Project sprint</strong><span>Team work session</span></div><div></div><div class="calendar-event event-community"><small>2× MONTH</small><strong>Community night</strong><span>Connection + pizza</span></div><div></div>
          <div class="calendar-event event-ops"><small>BIWEEKLY</small><strong>Leadership sync</strong><span>Decisions + owners</span></div><div></div><div class="calendar-event event-panel"><small>MONTHLY</small><strong>Panel or workshop</strong><span>Practical learning</span></div><div></div><div class="calendar-event event-resource"><small>ONGOING</small><strong>Resource update</strong><span>Document what changed</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section collaboration-section">
    <div class="shell">
      {section_heading('Collaboration model', 'The society should connect what already exists.', 'We are not trying to replace departments, clubs, makerspaces, career support, or faculty advising. We want to help students reach them and create projects that benefit from multiple perspectives.')}
      <div class="collaboration-map reveal">
        <div class="collab-center"><img src="assets/images/logo-mark.svg" alt=""><strong>3-2 Society</strong></div>
        <div class="collab-node c1">Academic departments</div><div class="collab-node c2">Career Exploration</div><div class="collab-node c3">Student organizations</div><div class="collab-node c4">Alumni and engineers</div><div class="collab-node c5">Makers and creators</div><div class="collab-node c6">Community partners</div>
        <svg viewBox="0 0 900 560" aria-hidden="true"><path d="M450 280 150 100M450 280 450 60M450 280 760 115M450 280 155 450M450 280 450 505M450 280 760 445"/></svg>
      </div>
    </div>
  </section>

  <section class="section standards-section"><div class="shell standards-grid"><div class="standards-copy reveal"><span class="eyebrow">Program standard</span><h2>Every event should answer four questions.</h2></div><div class="standard-list"><article class="reveal"><span>01</span><h3>Why are we doing this?</h3><p>A real member need, not a vague desire to be busy.</p></article><article class="reveal"><span>02</span><h3>Who owns the result?</h3><p>One responsible lead with support, deadlines, and authority.</p></article><article class="reveal"><span>03</span><h3>What changes afterward?</h3><p>A new connection, skill, decision, resource, or completed piece of work.</p></article><article class="reveal"><span>04</span><h3>What do we preserve?</h3><p>Notes, materials, contacts, feedback, and the next improvement.</p></article></div></div></section>

  <section class="final-cta compact-cta"><div class="shell final-cta-inner reveal"><span class="eyebrow eyebrow-light">Shape the program</span><h2>The first calendar should reflect<br>what students actually need.</h2><p>Founding members will help choose the first panel, workshop, project cycle, and community event.</p><a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Choose how you want to help {icon('external')}</a></div></section>
</main>'''
    return layout("programs.html", "Programs | Oberlin 3-2 Engineering Society", "Explore the community, mentoring, project, panel, workshop, resource, and showcase programs planned for the Oberlin 3-2 Engineering Society.", "programs", content, body_class="programs-page")


def projects_page() -> str:
    cards = "".join(project_card(project) for project in PROJECTS)
    content = f'''
<main id="main-content">
  {page_hero('Project incubator', 'Build with rigor.<br><span>Share what you learn.</span>', 'The project program is a small-team environment for turning a clear problem into a tested, documented, and explainable prototype.', '<span>HARDWARE</span><span>SOFTWARE</span><span>DESIGN</span>')}

  <section class="section project-philosophy"><div class="shell project-philosophy-grid"><div class="reveal"><span class="eyebrow">Project philosophy</span><h2>The goal is not to look technical.</h2></div><div class="reveal"><p class="large-copy">The goal is to understand a problem, make responsible choices, integrate different skills, test honestly, and communicate evidence.</p><p>Projects should be small enough to finish, meaningful enough to matter, and documented well enough for another student to reproduce, critique, or continue.</p></div></div></section>

  <section class="section project-library-section">
    <div class="shell">
      <div class="heading-row">{section_heading('Possible first directions', 'A starting field, not a fixed list.', 'These examples show the range of work the society could support. Founding members and project teams will select ideas based on value, feasibility, safety, available mentorship, and funding.')}<div class="filter-group" role="group" aria-label="Filter projects"><button class="active" data-project-filter="all">All</button><button data-project-filter="hardware">Hardware</button><button data-project-filter="robotics">Robotics</button><button data-project-filter="software">Software</button><button data-project-filter="data">Data</button><button data-project-filter="design">Design</button><button data-project-filter="creative">Creative</button></div></div>
      <div class="project-grid full-project-grid" data-project-grid>{cards}</div>
      <p class="empty-state" data-project-empty hidden>No project directions match that filter.</p>
    </div>
  </section>

  <section class="section build-process-section">
    <div class="shell">
      <div class="heading-row heading-row-light">{section_heading('The build cycle', 'From question to demonstration.', 'A visible process helps teams avoid rushing into parts before they understand the problem.')}<a class="button button-outline-light" href="{JOIN_URL}" target="_blank" rel="noopener">Join a project team {icon('external')}</a></div>
      <div class="build-process">
        <article class="build-step reveal"><span>01</span><div class="build-step-icon">{icon('target')}</div><h3>Frame</h3><p>Who is affected? What is the actual problem? What would meaningful improvement look like?</p></article>
        <article class="build-step reveal"><span>02</span><div class="build-step-icon">{icon('layers')}</div><h3>Scope</h3><p>Choose a version that can be completed with the available time, skills, materials, and safety support.</p></article>
        <article class="build-step reveal"><span>03</span><div class="build-step-icon">{icon('tool')}</div><h3>Prototype</h3><p>Build the smallest version that can answer the most important uncertainty.</p></article>
        <article class="build-step reveal"><span>04</span><div class="build-step-icon">{icon('bolt')}</div><h3>Test</h3><p>Collect evidence, identify failure modes, revise assumptions, and improve the design.</p></article>
        <article class="build-step reveal"><span>05</span><div class="build-step-icon">{icon('book')}</div><h3>Document</h3><p>Record the design, code, bill of materials, decisions, limitations, and next steps.</p></article>
        <article class="build-step reveal"><span>06</span><div class="build-step-icon">{icon('spark')}</div><h3>Share</h3><p>Demonstrate the result, explain what failed, and leave the next team a stronger starting point.</p></article>
      </div>
    </div>
  </section>

  <section class="section project-standards-section"><div class="shell project-standards-grid"><div class="reveal"><span class="eyebrow">Before a project begins</span><h2>Good engineering includes the conditions around the build.</h2><p>Funding is never the only requirement. Teams must also confirm supervision, access, storage, safety, consent, and responsible use.</p></div><div class="project-standard-list"><article class="reveal">{icon('shield')}<div><h3>Safety and training</h3><p>Tools, batteries, electronics, chemicals, fabrication, fieldwork, and moving systems require appropriate procedures and oversight.</p></div></article><article class="reveal">{icon('users')}<div><h3>Community and user consent</h3><p>Projects involving people or community partners are developed with them, not merely placed on them.</p></div></article><article class="reveal">{icon('target')}<div><h3>Clear success criteria</h3><p>Teams agree on the evidence that would show progress, failure, or the need to change direction.</p></div></article><article class="reveal">{icon('book')}<div><h3>Open documentation</h3><p>Project files should remain accessible to the society unless privacy, security, or partner agreements require limits.</p></div></article></div></div></section>

  <section class="final-cta compact-cta"><div class="shell final-cta-inner reveal"><span class="eyebrow eyebrow-light">Have a problem worth solving?</span><h2>Bring the question.<br>We will help form the team.</h2><p>Use the interest form to say you want to join projects or bring a project idea to the founding group.</p><a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Enter the project network {icon('external')}</a></div></section>
</main>'''
    return layout("projects.html", "Projects | Oberlin 3-2 Engineering Society", "See how the Oberlin 3-2 Engineering Society plans to support interdisciplinary engineering projects from problem definition through testing and demonstration.", "projects", content, body_class="projects-page")


def events_page() -> str:
    event_cards = "".join(f'''<article class="event-card reveal"><div class="event-rail"><span>{i:02d}</span><i></i></div><div class="event-main"><div class="event-top"><span class="event-phase">{escape(event['phase'])}</span><span class="status-pill">{escape(event['status'])}</span></div><small>{escape(event['timing'])}</small><h2>{escape(event['title'])}</h2><p>{escape(event['description'])}</p></div></article>''' for i, event in enumerate(EVENTS, 1))
    content = f'''
<main id="main-content">
  {page_hero('Events and launch plan', 'Momentum begins<br><span>with a next step.</span>', 'The first semester will combine community, practical guidance, and project formation. Dates will only be posted after spaces and campus requirements are confirmed.', '<span>FALL 2026</span><span>DATES PENDING</span>')}

  <section class="section events-intro-section"><div class="shell events-intro-grid"><div class="reveal"><span class="eyebrow">Launch standard</span><h2>No fake dates.<br>No empty calendar.</h2></div><div class="reveal"><p class="large-copy">Until an event is confirmed, the site labels it as recruiting, planning, or planned.</p><p>That keeps communication honest while still giving members a clear picture of the launch sequence and how to get involved.</p></div></div></section>

  <section class="section event-list-section"><div class="shell"><div class="event-list">{event_cards}</div></div></section>

  <section class="section event-anatomy-section"><div class="shell"><div class="heading-row heading-row-light">{section_heading('Every event has an engineering brief', 'Purpose. Owner. Action. Follow-through.', 'The event itself is only one part of the work. Strong preparation and clear follow-up turn attendance into value.')}</div><div class="event-anatomy-grid"><article class="reveal"><span>01</span><h3>Problem</h3><p>What student need is this event designed to address?</p></article><article class="reveal"><span>02</span><h3>Audience</h3><p>Who should be in the room, and how will they know it is for them?</p></article><article class="reveal"><span>03</span><h3>Action</h3><p>What can participants do during or immediately after the event?</p></article><article class="reveal"><span>04</span><h3>Artifact</h3><p>What notes, recording, guide, contact, or resource remains useful later?</p></article><article class="reveal"><span>05</span><h3>Feedback</h3><p>What evidence will tell us whether the event should change or return?</p></article></div></div></section>

  <section class="section volunteer-section"><div class="shell volunteer-grid"><div class="volunteer-console reveal"><span class="console-label">TABLE_TEAM / READINESS</span><div class="readiness-meter"><i style="--value: 82%"></i></div><ul><li><span>Message</span><strong>20-second explanation</strong></li><li><span>Action</span><strong>QR signup flow</strong></li><li><span>Proof</span><strong>Project demonstration</strong></li><li><span>Follow-up</span><strong>Kickoff invitation</strong></li></ul></div><div class="volunteer-copy reveal"><span class="eyebrow">Help run the launch</span><h2>The table is the first prototype of the society.</h2><p>We need people who can welcome students, explain the idea clearly, collect signups, demonstrate a small project, and follow up quickly after the fair.</p><div class="check-list"><span>{icon('check')} Table volunteers</span><span>{icon('check')} Graphic and social content</span><span>{icon('check')} Small engineering demo</span><span>{icon('check')} Pizza kickoff logistics</span></div><a class="button button-primary" href="{JOIN_URL}" target="_blank" rel="noopener">Volunteer for launch {icon('external')}</a></div></div></section>

  <section class="final-cta compact-cta"><div class="shell final-cta-inner reveal"><span class="eyebrow eyebrow-light">Stay close to the launch</span><h2>Sign up once.<br>Choose exactly how you want to help.</h2><p>The founding form includes leadership, table support, projects, events, outreach, and general membership.</p><a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Open the founding form {icon('external')}</a></div></section>
</main>'''
    return layout("events.html", "Events | Oberlin 3-2 Engineering Society", "See the Fall 2026 launch sequence, planned events, tabling preparation, panels, project pitch night, and showcase for the Oberlin 3-2 Engineering Society.", "events", content, body_class="events-page")


def resources_page() -> str:
    resource_cards = "".join(f'''<article class="resource-card reveal" data-resource-card data-group="{escape(resource['group'])}" data-search="{escape((resource['title'] + ' ' + resource['summary'] + ' ' + resource['source'] + ' ' + resource['group']).lower())}"><div class="resource-card-top"><span>{escape(resource['source'])}</span><small>{escape(resource['group'])}</small></div><h3>{escape(resource['title'])}</h3><p>{escape(resource['summary'])}</p><a href="{escape(resource['url'])}" target="_blank" rel="noopener">Open official source {icon('external')}</a></article>''' for resource in RESOURCES)
    item_schema = json.dumps({"@context": "https://schema.org", "@type": "ItemList", "name": "Oberlin 3-2 Engineering resources", "itemListElement": [{"@type": "ListItem", "position": i, "name": r["title"], "url": r["url"]} for i, r in enumerate(RESOURCES, 1)]}, indent=2)
    schema = f'<script type="application/ld+json">{item_schema}</script>'
    content = f'''
<main id="main-content">
  {page_hero('Resource library', 'Start with reliable<br><span>information.</span>', 'Official program, advising, academic, career, chartering, and partner-institution links in one searchable place.', '<span>OFFICIAL SOURCES FIRST</span>')}

  <section class="section resource-explainer"><div class="shell resource-explainer-grid"><div class="reveal"><span class="eyebrow">What 3-2 means</span><h2>Three years at Oberlin.<br>Two years in engineering.</h2></div><div class="reveal"><p class="large-copy">Oberlin's current program combines liberal arts and science study with focused engineering education at one of four partner institutions.</p><div class="partner-strip"><span>Caltech</span><span>Case Western</span><span>Columbia</span><span>Washington University in St. Louis</span></div><p class="source-note">Students should confirm current requirements, admission conditions, course planning, financial aid, and timelines directly with Oberlin and the relevant partner institution.</p></div></div></section>

  <section class="section resource-library-section"><div class="shell"><div class="resource-toolbar"><div>{section_heading('Search the library', 'Find the right source faster.', 'This page links outward. It does not replace official advising or partner-institution policies.')}</div><label class="resource-search">{icon('search')}<span class="sr-only">Search resources</span><input type="search" placeholder="Search planning, careers, partners…" data-resource-search></label></div><div class="resource-filters" role="group" aria-label="Filter resource groups"><button class="active" data-resource-filter="all">All</button><button data-resource-filter="3-2 planning">3-2 planning</button><button data-resource-filter="academic planning">Academic planning</button><button data-resource-filter="careers">Careers</button><button data-resource-filter="club operations">Club operations</button><button data-resource-filter="partner institutions">Partners</button></div><div class="resource-grid" data-resource-grid>{resource_cards}</div><p class="empty-state" data-resource-empty hidden>No resources match that search and filter.</p></div></section>

  <section class="section knowledge-system-section"><div class="shell knowledge-grid"><div class="knowledge-copy reveal"><span class="eyebrow eyebrow-light">What the society adds</span><h2>Official links are the foundation.<br><span>Student knowledge is the layer above them.</span></h2><p>Once the society is operating, members can preserve practical experience without confusing it with official policy.</p></div><div class="knowledge-stack reveal"><article><span>LEVEL 04</span><strong>What I wish I knew</strong><p>Reflections from students who navigated the transition.</p></article><article><span>LEVEL 03</span><strong>Templates and examples</strong><p>Planning tools, questions to ask, event notes, project documentation.</p></article><article><span>LEVEL 02</span><strong>Peer and alumni context</strong><p>Lived experience, clearly dated and attributed.</p></article><article><span>LEVEL 01</span><strong>Official sources</strong><p>Oberlin, partner institutions, catalog, calendar, and advising.</p></article></div></div></section>

  <section class="section resource-disclaimer"><div class="shell"><div class="disclaimer-card reveal"><div>{icon('shield')}</div><div><h2>Use the right source for the right decision.</h2><p>The society can help students find questions, compare experiences, and prepare for advising. It cannot approve courses, guarantee admission, interpret financial aid, or replace official program guidance.</p></div></div></div></section>

  <section class="final-cta compact-cta"><div class="shell final-cta-inner reveal"><span class="eyebrow eyebrow-light">Help improve the map</span><h2>Know a resource we should add?</h2><p>Send the organizing team an official source, useful campus contact, or resource category future members will need.</p><a class="button button-gold button-large" href="contact.html">Suggest a resource {icon('arrow')}</a></div></section>
</main>'''
    return layout("resources.html", "Resources | Oberlin 3-2 Engineering Society", "Search official Oberlin 3-2 program, advising, academic, career, student organization, and partner institution resources.", "resources", content, schema, "resources-page")


def join_page() -> str:
    faqs = [
        ("Do I have to be officially enrolled in 3-2?", "No. The society is designed to support current and prospective 3-2 students, but membership is open to all Oberlin students interested in engineering, technology, design, robotics, innovation, or hands-on projects."),
        ("Do I need technical or leadership experience?", "No. Curiosity, reliability, and willingness to learn are meaningful contributions. Project teams and events also need communication, research, organization, design, outreach, budgeting, documentation, and community-building skills."),
        ("Does the form automatically make me an officer?", "No. The form records your interests. The founding team will contact respondents, explain expectations, and confirm roles before anyone takes on a formal responsibility."),
        ("Can I join only for projects or events?", "Yes. Members can participate at different levels. You can join a project, help with one event, attend panels, use resources, or become more involved later."),
        ("Is the society already chartered and funded?", "The society is currently being organized as a proposed student organization. The team is preparing chartering, tabling, programming, and funding requests, and will communicate clearly when approvals are confirmed."),
        ("What happens after I submit the form?", "You will receive follow-up through your Oberlin email with information about the founding meeting, leadership roles, table preparation, kickoff, and ways to participate."),
    ]
    faq_html = "".join(f'''<article class="faq-item reveal"><button type="button" class="faq-question" aria-expanded="false"><span>{escape(q)}</span><i aria-hidden="true"></i></button><div class="faq-answer"><div><p>{escape(a)}</p></div></div></article>''' for q, a in faqs)
    faq_schema = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}, indent=2)
    roles = [
        ("01", "Founding member", "Help establish the organization, review the charter, shape the first semester, and demonstrate the student interest needed to launch."),
        ("02", "Student leader", "Express interest in vice president, treasurer, projects, programs, outreach, communications, or another needed role."),
        ("03", "Project builder", "Contribute hardware, software, mechanics, design, data, research, testing, documentation, or coordination."),
        ("04", "Events and outreach", "Help with panels, workshops, tabling, speakers, collaborations, social content, and the engineering showcase."),
        ("05", "General member", "Attend when you can, meet people, use resources, share ideas, and decide later whether you want a larger role."),
    ]
    role_html = "".join(f'''<article class="role-card reveal"><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div>{icon('arrow')}</article>''' for number, title, text in roles)
    content = f'''
<main id="main-content">
  {page_hero('Join the society', 'There is more than one<br><span>way to matter.</span>', 'Choose a level of involvement that fits your interests and time. You do not need to arrive with a title or a finished project idea.', '<span>OPEN TO ALL OBERLIN STUDENTS</span>')}

  <section class="section join-options-section"><div class="shell"><div class="join-options-grid"><div class="join-options-copy reveal"><span class="eyebrow">Choose your entry point</span><h2>Start where you are.<br>Grow from there.</h2><p>Strong organizations give people real ways to contribute without demanding the same level of commitment from everyone.</p></div><div class="role-list">{role_html}</div></div></div></section>

  <section class="section join-form-section"><div class="shell join-form-grid"><div class="join-form-card reveal"><span class="form-label">FOUNDING MEMBER INTEREST FORM</span><h2>Choose how you want to help.</h2><p>The form asks about your interests, class year, engineering areas, leadership roles, project participation, tabling availability, and planning-meeting availability.</p><div class="join-form-points"><span>{icon('check')} Takes about three minutes</span><span>{icon('check')} Does not automatically assign a role</span><span>{icon('check')} Uses your Oberlin email for follow-up</span></div><a class="button button-gold button-large" href="{JOIN_URL}" target="_blank" rel="noopener">Open the Google Form {icon('external')}</a></div><div class="join-qr-card reveal"><div class="qr-frame"><img src="assets/images/join-qr.png" alt="QR code for the Oberlin 3-2 Engineering Society founding member form"></div><span>SCAN TO JOIN</span><small>forms.gle/6pPoj3hqQMJADLjZ6</small><div class="qr-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div></div></section>

  <section class="section after-submit-section"><div class="shell"><div class="heading-row heading-row-light">{section_heading('What happens next', 'A clear path from interest to involvement.', 'Submitting the form is the beginning of a conversation, not an automatic commitment.')}</div><div class="after-submit-grid"><article class="reveal"><span>01</span><h3>We review your interests</h3><p>The organizing team groups people by leadership, projects, events, outreach, and general membership.</p></article><article class="reveal"><span>02</span><h3>You receive a follow-up</h3><p>Expect information about the founding meeting, table preparation, and the first public event.</p></article><article class="reveal"><span>03</span><h3>You choose a first action</h3><p>Join a planning meeting, volunteer at the table, help with launch content, or simply attend the kickoff.</p></article><article class="reveal"><span>04</span><h3>Roles become specific</h3><p>Before taking responsibility, you will know the expectations, support, timeline, and decision process.</p></article></div></div></section>

  <section class="section faq-section"><div class="shell faq-grid"><div class="faq-copy reveal"><span class="eyebrow">Questions before joining</span><h2>Know what you are signing up for.</h2><p>We want participation to begin with clarity, not pressure.</p><a class="text-link" href="contact.html">Ask a different question {icon('arrow')}</a></div><div class="faq-list">{faq_html}</div></div></section>
</main>'''
    return layout("join.html", "Join | Oberlin 3-2 Engineering Society", "Join the Oberlin 3-2 Engineering Society as a founding member, student leader, project builder, event volunteer, or general member.", "join", content, f'<script type="application/ld+json">{faq_schema}</script>', "join-page")


def contact_page() -> str:
    subject = "Oberlin%203-2%20Engineering%20Society%20Inquiry"
    content = f'''
<main id="main-content">
  {page_hero('Contact and partnerships', 'Let us build the<br><span>right connection.</span>', 'Reach the organizing team about membership, advising, campus collaboration, alumni involvement, panels, project support, or community partnerships.', '<span>STUDENT-BUILT</span><span>COLLABORATIVE</span>')}

  <section class="section contact-section"><div class="shell contact-grid"><div class="contact-intro reveal"><span class="eyebrow">Start here</span><h2>Tell us what you are trying to make possible.</h2><p>Specific messages are easier to act on. Include who you are, the kind of collaboration you have in mind, the timing, and the next step you are asking for.</p><div class="contact-direct"><a href="mailto:{CONTACT_EMAIL}?subject={subject}">{icon('mail')}<span><small>EMAIL THE ORGANIZING TEAM</small><strong>{escape(CONTACT_EMAIL)}</strong></span>{icon('arrow')}</a><a href="{INSTAGRAM_URL}" target="_blank" rel="noopener">{icon('instagram')}<span><small>FOLLOW AND MESSAGE</small><strong>{escape(CONFIG['instagram_handle'])}</strong></span>{icon('external')}</a></div></div><div class="contact-brief reveal"><span class="brief-label">MESSAGE BRIEF</span><div class="brief-row"><span>01</span><p><strong>Context</strong>Who are you, and how are you connected to Oberlin or engineering?</p></div><div class="brief-row"><span>02</span><p><strong>Purpose</strong>What opportunity, question, resource, event, or project are you writing about?</p></div><div class="brief-row"><span>03</span><p><strong>Timing</strong>Is there a date, deadline, semester, or preparation window we should know?</p></div><div class="brief-row"><span>04</span><p><strong>Next action</strong>Are you asking for a meeting, introduction, speaker, co-sponsorship, feedback, or volunteers?</p></div><a class="button button-primary" href="mailto:{CONTACT_EMAIL}?subject={subject}">Write the message {icon('arrow')}</a></div></div></section>

  <section class="section partnership-section"><div class="shell"><div class="heading-row heading-row-light">{section_heading('Ways to collaborate', 'Bring a resource, problem, perspective, or opportunity.', 'The strongest partnerships give students something concrete to learn, build, decide, or contribute.')}</div><div class="partnership-grid"><article class="reveal"><div>{icon('mic')}</div><span>PANELS + WORKSHOPS</span><h3>Share practical experience</h3><p>Career paths, engineering disciplines, internships, technical communication, design reviews, ethics, or the 3-2 transition.</p></article><article class="reveal"><div>{icon('tool')}</div><span>PROJECT SUPPORT</span><h3>Mentor a real build</h3><p>Help a team scope a problem, review a design, understand constraints, access equipment, or test responsibly.</p></article><article class="reveal"><div>{icon('network')}</div><span>CAMPUS COLLABORATION</span><h3>Connect existing communities</h3><p>Co-host an event, introduce relevant resources, invite interdisciplinary participation, or share specialized knowledge.</p></article><article class="reveal"><div>{icon('users')}</div><span>ALUMNI + PARTNERS</span><h3>Open the next door</h3><p>Offer perspective, host a virtual conversation, share an opportunity, or connect students with a person they should know.</p></article></div></div></section>

  <section class="section contact-note-section"><div class="shell"><div class="contact-note reveal"><div>{icon('shield')}</div><div><span>STATUS NOTE</span><h2>The society is currently being organized as a proposed student organization.</h2><p>Partnership ideas are welcome now. Formal commitments, spending, event reservations, and representations of Oberlin College remain subject to the appropriate campus approvals.</p></div></div></div></section>
</main>'''
    return layout("contact.html", "Contact | Oberlin 3-2 Engineering Society", "Contact the Oberlin 3-2 Engineering Society organizing team about membership, collaborations, speakers, panels, projects, and resources.", "contact", content, body_class="contact-page")


def privacy_page() -> str:
    content = f'''
<main id="main-content">
  {page_hero('Privacy', 'Simple site.<br><span>Simple data practices.</span>', 'This is a static information website. It does not create user accounts, sell personal information, or include advertising trackers.', '<span>LAST UPDATED AUGUST 2026</span>')}
  <section class="section legal-section"><div class="shell legal-copy"><h2>Information collected on this website</h2><p>The website itself does not contain a database or account system. Standard infrastructure providers, such as GitHub Pages or a domain provider, may process technical information needed to serve the site, including IP addresses, browser information, and request logs, according to their own policies.</p><h2>Founding member form</h2><p>The membership form is hosted by Google Forms. Information submitted there is collected for society organizing, membership follow-up, leadership interest, events, and project participation. Do not submit sensitive personal information that the form does not request.</p><h2>Email and Instagram</h2><p>When you email the organizing team or contact the Instagram account, the information you provide is handled through those services and used to respond to your message and organize society activities.</p><h2>External links</h2><p>The resource library links to Oberlin College, partner institutions, Google, Instagram, and other external websites. Their privacy practices apply once you leave this site.</p><h2>Questions</h2><p>Questions about this website can be sent to <a href="mailto:{CONTACT_EMAIL}">{escape(CONTACT_EMAIL)}</a>.</p></div></section>
</main>'''
    return layout("privacy.html", "Privacy | Oberlin 3-2 Engineering Society", "Privacy information for the Oberlin 3-2 Engineering Society website and founding member form.", "privacy", content, body_class="privacy-page")


def not_found_page() -> str:
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script>document.documentElement.classList.add('js')</script><title>Page Not Found | {escape(CONFIG['name'])}</title><meta name="robots" content="noindex"><link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/styles.css"></head><body class="not-found-page"><main class="not-found"><div class="not-found-grid" aria-hidden="true"></div><div class="not-found-content"><img src="/assets/images/logo-mark.svg" alt=""><span>ERROR // 404</span><h1>This route is<br>not in the system.</h1><p>The page may have moved, or the address may be incomplete.</p><a class="button button-gold button-large" href="/">Return to the homepage {icon('arrow')}</a></div></main><script src="/assets/js/main.js" defer></script></body></html>'''


def manifest() -> dict:
    return {
        "name": CONFIG["name"],
        "short_name": CONFIG["short_name"],
        "description": CONFIG["description"],
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#f6f1e7",
        "theme_color": "#11110f",
        "icons": [
            {"src": "assets/images/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "assets/images/icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }


def write(filename: str, text: str) -> None:
    path = SITE / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def build() -> None:
    # Recreate the public output so deleted pages and stale assets cannot linger.
    if SITE.exists():
        shutil.rmtree(SITE)
    shutil.copytree(ROOT / "assets", SITE / "assets")

    pages = {
        "index.html": home_page(),
        "about.html": about_page(),
        "programs.html": programs_page(),
        "projects.html": projects_page(),
        "events.html": events_page(),
        "resources.html": resources_page(),
        "join.html": join_page(),
        "contact.html": contact_page(),
        "privacy.html": privacy_page(),
        "404.html": not_found_page(),
    }
    for filename, html in pages.items():
        write(filename, html)

    write("CNAME", "oberlin32engineeringsociety.com\n")
    write(".nojekyll", "")
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {DOMAIN}/sitemap.xml\n")
    urls = ["", "about.html", "programs.html", "projects.html", "events.html", "resources.html", "join.html", "contact.html", "privacy.html"]
    sitemap_urls = "\n".join(f"  <url><loc>{DOMAIN}/{url}</loc></url>" for url in urls)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sitemap_urls}\n</urlset>\n')
    write("manifest.webmanifest", json.dumps(manifest(), indent=2) + "\n")
    print(f"Built {len(pages)} pages in {SITE}")


if __name__ == "__main__":
    build()
