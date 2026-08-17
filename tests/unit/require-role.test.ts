import { describe, expect, it } from 'vitest'
import { requireRoleFromRecord } from '@/lib/auth/requireRole'

describe('admin role gates', () => {
  it('rejects a user with no active admin profile', async () => {
    await expect(requireRoleFromRecord(null, 'EDITOR')).rejects.toThrow('ADMIN_ACCESS_REQUIRED')
  })

  it('accepts SUPER_ADMIN when ADMIN is required', async () => {
    await expect(requireRoleFromRecord({ userId: 'x', email: 'owner@oberlin.edu', displayName: 'Owner', role: 'SUPER_ADMIN', active: true, scopes: [], canPublish: true }, 'ADMIN')).resolves.toMatchObject({ role: 'SUPER_ADMIN' })
  })

  it('rejects EDITOR when ADMIN is required', async () => {
    await expect(requireRoleFromRecord({ userId: 'x', email: 'editor@oberlin.edu', displayName: 'Editor', role: 'EDITOR', active: true, scopes: [], canPublish: false }, 'ADMIN')).rejects.toThrow('ADMIN_ROLE_REQUIRED')
  })
})
