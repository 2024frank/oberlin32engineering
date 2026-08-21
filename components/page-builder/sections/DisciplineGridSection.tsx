import type { z } from 'zod'
import type { disciplineGridSchema } from '@/lib/page-builder/schemas/engineering'
import { TechnicalIcon } from '@/components/public/TechnicalIcons'

// Icons are the site's own drafting-style set, keyed off the discipline name;
// an unknown discipline gets the caliper fallback rather than a broken glyph.
export function DisciplineGridSection({ section }: { section: z.infer<typeof disciplineGridSchema> }) {
  return <section className="cms-section cms-section--soft"><div className="shell"><h2>{section.heading}</h2><div className="discipline-grid">{section.items.map(item =>
    <article key={item.name}>
      <TechnicalIcon name={item.name} />
      <h3>{item.name}</h3>
      <p>{item.description}</p>
    </article>
  )}</div></div></section>
}
