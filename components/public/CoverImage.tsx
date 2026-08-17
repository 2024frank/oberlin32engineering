import 'server-only'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// News, event and project records all carry a cover_media_id that no detail template
// rendered, so pages with a cover still showed a bare charcoal header. Renders the cover
// as the hero background; returns null when there is no cover, leaving the plain header.
export async function CoverImage({ mediaId }: { mediaId?: string | null }) {
  if (!mediaId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('media').select('public_url').eq('id', mediaId).maybeSingle()
  if (!data?.public_url) return null
  return <Image className="detail-hero__bg" src={data.public_url as string} alt="" aria-hidden="true" fill sizes="100vw" priority quality={72} />
}

export async function hasCover(mediaId?: string | null) {
  if (!mediaId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return false
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('media').select('id').eq('id', mediaId).maybeSingle()
  return Boolean(data?.id)
}
