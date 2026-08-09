import type { APIRoute } from 'astro';
import { pageIds, pageUrl } from '../lib/page-meta';

export const prerender = true;

const priorities: Partial<Record<(typeof pageIds)[number], string>> = {
  index: '1.0', pathway: '0.9', join: '0.9', about: '0.8', leadership: '0.8',
};

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://www.oberlin32engineeringsociety.com');
  const entries = pageIds.filter((id) => id !== '404').map((id) => {
    const url = new URL(pageUrl(id), base).href;
    return `<url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${priorities[id] ?? '0.6'}</priority></url>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
