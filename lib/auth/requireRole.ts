import { redirect } from 'next/navigation'
import type { AdminRole } from '@/lib/permissions/types'
import { getCurrentAdmin, type CurrentAdmin } from './session'

const rank: Record<AdminRole, number> = { EDITOR: 1, ADMIN: 2, SUPER_ADMIN: 3 }

export async function requireRoleFromRecord(record: CurrentAdmin | null, minimumRole: AdminRole): Promise<CurrentAdmin> {
  if (!record || !record.active) throw new Error('ADMIN_ACCESS_REQUIRED')
  if (rank[record.role] < rank[minimumRole]) throw new Error('ADMIN_ROLE_REQUIRED')
  return record
}

export async function requireAdmin(): Promise<CurrentAdmin> {
  const record = await getCurrentAdmin()
  if (!record) redirect('/admin/login')
  return requireRoleFromRecord(record, 'EDITOR')
}

export async function requireRole(minimumRole: AdminRole): Promise<CurrentAdmin> {
  return requireRoleFromRecord(await getCurrentAdmin(), minimumRole)
}
