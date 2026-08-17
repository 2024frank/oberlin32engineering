import type { Metadata } from 'next'
import { metadataForCmsPage } from '@/lib/seo/metadata'
import { getPublishedPageBySlug } from '@/lib/page-builder/publicPages'
import { DirectoryHero } from '@/components/public/DirectoryHero'
import Link from 'next/link';import { listPublishedNews } from '@/lib/content/news'
export async function generateMetadata():Promise<Metadata>{return metadataForCmsPage(await getPublishedPageBySlug("news"))}
export default async function NewsPage(){const items=await listPublishedNews();return <><DirectoryHero slug={"news"} eyebrow={"News"} title={"News"} description={"Updates from meetings, projects, and events."} imageSlug={"background-cad-laptop"}/><section className="directory"><div className="shell">{items.length?<div className="card-grid">{items.map((n:any)=><article className="content-card" key={n.id}><small>{n.published_at?new Date(n.published_at).toLocaleDateString():''}</small><h2>{n.title}</h2><p>{n.excerpt}</p><Link href={`/news/${n.slug}`}>Read update →</Link></article>)}</div>:<div className="empty-state"><h2>No news yet.</h2><p>Updates will appear here as the club gets going.</p></div>}</div></section></>}
