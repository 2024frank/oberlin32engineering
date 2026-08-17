import 'server-only'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Hero = { eyebrow: string; title: string; description: string; image: { url: string; alt: string } | null }

// Directory routes are code pages, but their hero copy is editable in the officer portal
// like any other page. This reads the published hero for the slug and falls back to the
// props, so the route still renders if the page row or Supabase is missing.
async function publishedHero(slug: string): Promise<Partial<Hero> | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createSupabaseServerClient()
  const { data: page } = await supabase.from('pages').select('published_version_id').eq('slug', slug).maybeSingle()
  if (!page?.published_version_id) return null
  const { data: version } = await supabase.from('page_versions').select('sections_snapshot').eq('id', page.published_version_id).maybeSingle()
  const sections = (version?.sections_snapshot ?? []) as Array<Record<string, string>>
  const hero = sections.find(section => section?.type === 'hero')
  if (!hero) return null

  let image: Hero['image'] = null
  if (hero.imageId) {
    const { data: media } = await supabase.from('media').select('public_url,alt_text').eq('id', hero.imageId).maybeSingle()
    if (media?.public_url) image = { url: media.public_url as string, alt: (hero.imageAlt || (media.alt_text as string) || '') }
  }
  return { eyebrow: hero.eyebrow, title: hero.headline, description: hero.body, image }
}

async function mediaBySlug(slug: string): Promise<Hero['image']> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('media').select('public_url,alt_text').eq('legacy_source_id', `site-${slug}`).maybeSingle()
  return data?.public_url ? { url: data.public_url as string, alt: (data.alt_text as string) ?? '' } : null
}

export async function DirectoryHero({ slug, eyebrow, title, description, imageSlug }: { slug?: string; eyebrow: string; title: string; description: string; imageSlug?: string }) {
  const published = slug ? await publishedHero(slug) : null
  const image = published?.image ?? (imageSlug ? await mediaBySlug(imageSlug) : null)
  const copy = {
    eyebrow: published?.eyebrow || eyebrow,
    title: published?.title || title,
    description: published?.description || description
  }

  return (
    <section className={`directory-hero${image ? ' directory-hero--image' : ''}`}>
      {image && <Image className="directory-hero__bg" src={image.url} alt="" aria-hidden="true" fill sizes="100vw" priority quality={72} />}
      <div className="shell">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
    </section>
  )
}
