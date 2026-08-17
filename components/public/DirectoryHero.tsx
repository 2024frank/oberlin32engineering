import 'server-only'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Directory pages are code routes rather than CMS pages, so their hero image is looked
// up by the media row's stable legacy_source_id instead of a page-builder mediaId.
async function heroImage(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('media')
    .select('public_url,alt_text')
    .eq('legacy_source_id', `site-${slug}`)
    .maybeSingle()
  return data?.public_url ? { url: data.public_url as string, alt: (data.alt_text as string) ?? '' } : null
}

export async function DirectoryHero({ eyebrow, title, description, imageSlug }: { eyebrow: string; title: string; description: string; imageSlug?: string }) {
  const image = imageSlug ? await heroImage(imageSlug) : null
  return (
    <section className={`directory-hero${image ? ' directory-hero--image' : ''}`}>
      {image && <Image className="directory-hero__bg" src={image.url} alt="" aria-hidden="true" fill sizes="100vw" priority quality={72} />}
      <div className="shell">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  )
}
