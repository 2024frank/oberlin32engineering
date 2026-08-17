import { ContentManager } from '@/components/admin/content/ContentManager'
import { TeamUpdateReviewQueue } from '@/components/admin/projects/TeamUpdateReviewQueue'
import { listAdminContent } from '@/lib/cms/adminContent'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { listAdminTeamUpdateReviews } from '@/lib/projects/workspace'
export default async function Page(){const admin=await requireAdmin();const[rows,reviews]=await Promise.all([listAdminContent('project_updates'),admin.role==='EDITOR'?Promise.resolve([]):listAdminTeamUpdateReviews()]);const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'project_updates')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('project_updates'));return <>{admin.role!=='EDITOR'&&<TeamUpdateReviewQueue initial={reviews}/>}<ContentManager entityType="project_updates" title="Project Updates" rows={rows} canPublish={canPublish}/></>}
