import type { AdminRole, Permission } from './types'

export function can(role: AdminRole, permission: Permission, scopes: string[] = [], requestedScope?: string): boolean {
  if (role === 'SUPER_ADMIN') return true
  if (role === 'ADMIN') return !['MANAGE_USERS', 'MANAGE_STAFF', 'MANAGE_SITE_SETTINGS'].includes(permission)
  if (permission === 'EDIT_CONTENT') return Boolean(requestedScope && scopes.includes(requestedScope))
  if (permission === 'PUBLISH_CONTENT') return false
  if (permission === 'VIEW_AUDIT') return true
  return false
}
