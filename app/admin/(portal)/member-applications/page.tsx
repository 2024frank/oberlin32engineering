import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { MemberApplicationQueue } from '@/components/admin/members/MemberApplicationQueue'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listMembershipRequests } from '@/lib/auth/memberServer'

export default async function MemberApplicationsPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" />
  return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Community</p><h1>Member applications</h1><p>Approve only verified @oberlin.edu requests. Approved students receive an activation email before member-portal access begins.</p></div></div><MemberApplicationQueue initial={await listMembershipRequests('PENDING_APPROVAL')} /></main>
}
