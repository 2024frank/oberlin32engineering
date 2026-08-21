import type { z } from 'zod'
import type { featuresGridSchema } from '@/lib/page-builder/schemas/content'
import { TechnicalIcon } from '@/components/public/TechnicalIcons'

// Feature cards use the site's own icon set, matched from the item title, so
// every card carries a drawn mark instead of whatever glyph the CMS held.
export function FeaturesGridSection({ section }: { section: z.infer<typeof featuresGridSchema> }) {
  return <section className="cms-section"><div className="shell"><div className="section-heading">{section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}<h2>{section.heading}</h2><p>{section.body}</p></div><div className="feature-grid">{section.items.map(item =>
    <article key={item.title}>
      <TechnicalIcon name={`${item.title} ${item.icon ?? ''}`} />
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </article>
  )}</div></div></section>
}
