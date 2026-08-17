import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
export default async function Page(){const admin=await requireAdmin();const rows=await listAdminContent('sponsors');const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'sponsors')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('sponsors'));return <ContentManager entityType="sponsors" title="Sponsors & Collaborators" rows={rows} canPublish={canPublish}/>}
