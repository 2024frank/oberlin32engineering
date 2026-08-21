import Image from 'next/image'
import Link from 'next/link'
import type { z } from 'zod'
import type { heroSchema } from '@/lib/page-builder/schemas/hero'
import type { PageRenderContext } from '@/lib/page-builder/types'

export function HeroSection({ section, context }: { section: z.infer<typeof heroSchema>; context?: PageRenderContext }) {
  const media = section.imageId ? context?.media?.[section.imageId] : undefined
  return <section className={`cms-section hero hero--${section.layout}${media ? ' hero--bg' : ''}`}>
    {/* When a hero has an image it fills the whole background behind the copy; the
        headline carries the meaning, so the image layer is decorative here. */}
    {media && <Image className="hero__bg" src={media.url} alt="" aria-hidden="true" fill sizes="100vw" priority quality={72} />}
    <div className="shell hero__inner">
      <div className="hero__copy">
        {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
        <h1>{section.headline}</h1>
        {section.body && <p className="hero__lead">{section.body}</p>}
        <div className="button-row">
          {section.primaryCta && <Link className="button button--primary" href={section.primaryCta.href}>{section.primaryCta.label}</Link>}
          {section.secondaryCta && <Link className="button button--secondary" href={section.secondaryCta.href}>{section.secondaryCta.label}</Link>}
        </div>
      </div>
      {!media && <div className="hero__mark" aria-hidden="true"><span>OEC</span><i /></div>}
    </div>
    {/* Drafting-sheet corner annotation: the club's real coordinates. */}
    {media && <p className="hero__annotation" aria-hidden="true"><span>41.29° N / 82.22° W</span><span>Oberlin, Ohio</span></p>}
  </section>
}
