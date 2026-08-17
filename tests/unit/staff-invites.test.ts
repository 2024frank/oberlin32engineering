import { describe, expect, it } from 'vitest'
import {
  acceptStaffInvite,
  assertStaffInviteTransition,
  createStaffInvite,
  hashStaffInviteToken,
  normalizeStaffInviteRole,
  type StaffInviteRecord,
} from '@/lib/auth/staffInvites'

describe('staff invitation lifecycle', () => {
  it('allows only ADMIN and EDITOR to be directly invited', () => {
    expect(normalizeStaffInviteRole('ADMIN')).toBe('ADMIN')
    expect(normalizeStaffInviteRole('EDITOR')).toBe('EDITOR')
    expect(() => normalizeStaffInviteRole('SUPER_ADMIN')).toThrow('INVITE_ROLE_NOT_ALLOWED')
  })

  it('rejects expired and revoked invitations', () => {
    expect(() => assertStaffInviteTransition({ status: 'REVOKED', expiresAt: '2099-01-01T00:00:00.000Z' })).toThrow('STAFF_INVITE_REVOKED')
    expect(() => assertStaffInviteTransition({ status: 'INVITED', expiresAt: '2000-01-01T00:00:00.000Z' }, new Date('2026-08-17T06:00:00.000Z'))).toThrow('STAFF_INVITE_EXPIRED')
  })

  it('stores only the token digest and sends the raw token only through the activation URL', async () => {
    let inserted: StaffInviteRecord | undefined
    let sentUrl = ''
    const result = await createStaffInvite(
      { email: 'officer@oberlin.edu', displayName: 'Officer', role: 'EDITOR', scopes: ['projects'], canPublish: false, origin: 'https://engineering.example' },
      'super-1',
      {
        randomToken: () => 'raw-secret-token',
        insertInvite: async (row) => { inserted = { ...row, id: 'invite-1' }; return 'invite-1' },
        generateAuthInviteLink: async (_email, redirectTo) => `https://auth.example/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
        sendInviteEmail: async ({ activationUrl }) => { sentUrl = activationUrl },
        audit: async () => undefined,
      },
      new Date('2026-08-17T06:00:00.000Z'),
    )

    expect(result.id).toBe('invite-1')
    expect(inserted).toBeDefined()
    expect(inserted?.tokenHash).toBe(hashStaffInviteToken('raw-secret-token'))
    expect(JSON.stringify(inserted)).not.toContain('raw-secret-token')
    expect(sentUrl).toContain('raw-secret-token')
  })

  it('requires the authenticated email to match the invitation', async () => {
    const token = 'raw-secret-token'
    await expect(acceptStaffInvite(
      { token, currentUser: { id: 'user-1', email: 'wrong@oberlin.edu' } },
      {
        getInviteByHash: async () => ({
          id: 'invite-1', email: 'officer@oberlin.edu', displayName: 'Officer', role: 'EDITOR', scopes: [], canPublish: false,
          tokenHash: hashStaffInviteToken(token), status: 'INVITED', expiresAt: '2099-01-01T00:00:00.000Z', invitedBy: 'super-1', createdAt: '2026-08-17T06:00:00.000Z',
        }),
        activateInvite: async () => undefined,
      },
    )).rejects.toThrow('STAFF_INVITE_IDENTITY_MISMATCH')
  })
})
