import { PageRenderer } from '@/components/page-builder/PageRenderer'
import { getCmsRenderContext } from '@/lib/page-builder/publicPages'
import type { PageSnapshot } from '@/lib/page-builder/types'
export async function CmsPage({page,mode='public'}:{page:PageSnapshot;mode?:'public'|'preview'}){const hasVisibleHero=page.sections.some(section=>section.type==='hero'&&section.isVisible);return <>{!hasVisibleHero&&<h1 className="sr-only">{page.title}</h1>}<PageRenderer sections={page.sections} context={await getCmsRenderContext()} mode={mode}/></>}
