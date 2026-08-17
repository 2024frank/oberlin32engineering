import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
export default async function Page(){const admin=await requireAdmin();const rows=await listAdminContent('documents');const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'documents')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('documents'));return <ContentManager entityType="documents" title="Documents" rows={rows} canPublish={canPublish}/>}
