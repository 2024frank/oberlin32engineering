import { sectionRegistry, validateSection } from '@/lib/page-builder/registry'
import type { PageRenderContext, PageSection } from '@/lib/page-builder/types'

export function PageRenderer({ sections, context = {}, mode = 'public' }: { sections: PageSection[] | unknown[]; context?: PageRenderContext; mode?: 'public' | 'preview' }) {
  return <div className="page-renderer" data-render-mode={mode}>{sections.map((raw, index) => { const section=validateSection(raw); if(!section.isVisible) return null; const Component=sectionRegistry[section.type].component; return <Component key={section.stableKey||index} section={section} context={context} /> })}</div>
}
