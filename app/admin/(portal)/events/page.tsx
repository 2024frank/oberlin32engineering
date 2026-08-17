import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
export default async function Page(){const admin=await requireAdmin();const rows=await listAdminContent('events');const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'events')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('events'));return <ContentManager entityType="events" title="Events" rows={rows} canPublish={canPublish}/>}
