import { RedirectManager } from '@/components/admin/system/RedirectManager'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listRedirects } from '@/lib/cms/redirects'
import { can } from '@/lib/permissions/can'
export default async function RedirectsPage(){const admin=await requireAdmin();return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">System</p><h1>Redirects</h1><p>Preserve important URLs when routes or names change.</p></div></div><RedirectManager initial={await listRedirects()} canEdit={can(admin.role,'MANAGE_SITE_SETTINGS')}/></main>}
