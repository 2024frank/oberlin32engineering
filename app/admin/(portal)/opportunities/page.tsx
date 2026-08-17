import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
export default async function Page(){const admin=await requireAdmin();const rows=await listAdminContent('opportunities');const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'opportunities')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('opportunities'));return <ContentManager entityType="opportunities" title="Opportunities" rows={rows} canPublish={canPublish}/>}
