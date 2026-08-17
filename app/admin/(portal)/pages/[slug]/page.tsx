import { PageEditor } from '@/components/page-builder/admin/PageEditor'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listMedia } from '@/lib/cms/media'
import { can } from '@/lib/permissions/can'
import { getDraftPageBySlug, listPageVersions } from '@/lib/page-builder/pageService'

export default async function PageEditorRoute({ params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin()
  const page = await getDraftPageBySlug((await params).slug)
  const [versions, mediaAssets] = await Promise.all([listPageVersions(page.pageId), listMedia()])
  const canPublish = can(admin.role, 'PUBLISH_CONTENT', admin.scopes, 'pages') || (admin.role === 'EDITOR' && admin.canPublish && admin.scopes.includes('pages'))
  return <PageEditor initial={page} versions={versions} canPublish={canPublish} mediaAssets={mediaAssets} />
}
