import type { z } from 'zod'; import type { richTextSchema } from '@/lib/page-builder/schemas/content'
export function RichTextSection({section}:{section:z.infer<typeof richTextSchema>}){return <section className="cms-section"><div className="shell prose">{section.heading&&<h2>{section.heading}</h2>}{section.body.split('\n').filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div></section>}
