import Image from 'next/image'
import type { z } from 'zod'; import type { leadershipGridSchema } from '@/lib/page-builder/schemas/community'; import type { PageRenderContext } from '@/lib/page-builder/types'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('')
}

export function LeadershipGridSection({ section, context }: { section: z.infer<typeof leadershipGridSchema>; context?: PageRenderContext }) {
  const items = (context?.leaders ?? []).slice(0, section.limit) as Array<Record<string, string>>
  return <section className="cms-section"><div className="shell"><h2>{section.heading}</h2><div className="card-grid">{items.map(person => {
    // Alt text comes from the media record, where it is required at the database level.
    const photo = person.photo_media_id ? context?.media?.[person.photo_media_id] : undefined
    return <article className="content-card leader-card" key={person.id}>
      {photo
        ? <Image className="leader-card__photo" src={photo.url} alt={person.role_title ? `${person.name}, ${person.role_title}` : person.name} width={420} height={420} sizes="(max-width: 900px) 90vw, 30vw" quality={78} />
        : <span className="leader-card__photo leader-card__photo--placeholder" aria-hidden="true">{initials(person.name)}</span>}
      <h3>{person.name}</h3>
      {person.role_title && <p className="eyebrow">{person.role_title}</p>}
      {person.bio && <p>{person.bio}</p>}
    </article>
  })}</div></div></section>
}
