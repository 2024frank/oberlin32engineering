import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { AdminUsersManager } from '@/components/admin/system/AdminUsersManager'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listAdminUsers } from '@/lib/auth/adminUsers'
import { listStaffInvites } from '@/lib/auth/staffInviteServer'
import { can } from '@/lib/permissions/can'

export default async function UsersPage() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'MANAGE_USERS')) return <AccessDenied title="Super Admin access required" />
  const [users, invites] = await Promise.all([listAdminUsers(), listStaffInvites()])
  return <main className="admin-panel">
    <div className="admin-page-heading"><div><p className="eyebrow">System</p><h1>Staff, roles &amp; invitations</h1><p>Only a Super Admin can invite or change staff access. Uninvited identities cannot enter the officer portal.</p></div></div>
    <AdminUsersManager initialUsers={users} initialInvites={invites} />
  </main>
}
