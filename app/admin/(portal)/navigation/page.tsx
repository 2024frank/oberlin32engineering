import { NavigationManager } from '@/components/admin/system/NavigationManager'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listNavigationForAdmin } from '@/lib/cms/navigation'
import { can } from '@/lib/permissions/can'
export default async function NavigationPage(){const admin=await requireAdmin();return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">System</p><h1>Navigation</h1><p>Control the public site menu without changing code.</p></div></div><NavigationManager initial={await listNavigationForAdmin()} canEdit={can(admin.role,'MANAGE_SITE_SETTINGS')}/></main>}
