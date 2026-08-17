import { Bot, CircuitBoard, Cpu, Cog, FlaskConical, Waves, Wrench } from 'lucide-react'
import type { ComponentType } from 'react'
import type { z } from 'zod'; import type { disciplineGridSchema } from '@/lib/page-builder/schemas/engineering'

// Was a single "⌁" character, which renders as a different tiny mark in every font.
// Real icons keyed off the discipline name, with a neutral fallback so an officer adding
// a new discipline in the portal still gets a sensible glyph rather than a broken one.
const ICONS: Record<string, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  mechanical: Cog,
  electrical: CircuitBoard,
  'computing & ai': Cpu,
  computing: Cpu,
  'chemical & materials': FlaskConical,
  chemical: FlaskConical,
  robotics: Bot,
  'civil & environmental': Waves,
  civil: Waves
}

export function DisciplineGridSection({ section }: { section: z.infer<typeof disciplineGridSchema> }) {
  return <section className="cms-section cms-section--soft"><div className="shell"><h2>{section.heading}</h2><div className="discipline-grid">{section.items.map(item => {
    const Icon = ICONS[item.name.trim().toLowerCase()] ?? Wrench
    return <article key={item.name}>
      <Icon className="discipline-icon" aria-hidden={true} />
      <h3>{item.name}</h3>
      <p>{item.description}</p>
    </article>
  })}</div></div></section>
}
