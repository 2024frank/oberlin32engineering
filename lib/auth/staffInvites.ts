import { createHash, randomBytes } from 'node:crypto'

export type StaffInviteRole = 'ADMIN' | 'EDITOR'
export type StaffInviteStatus = 'INVITED' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

export type StaffInviteRecord = {
  id: string
  email: string
  displayName: string
  role: StaffInviteRole
  scopes: string[]
  canPublish: boolean
  tokenHash: string
  status: StaffInviteStatus
  expiresAt: string
  invitedBy: string
  createdAt: string
}

type NewStaffInvite = Omit<StaffInviteRecord, 'id'>

type CreateStaffInviteDeps = {
  randomToken?: () => string
  insertInvite: (row: NewStaffInvite) => Promise<string>
  generateAuthInviteLink: (email: string, nextPath: string) => Promise<string>
  sendInviteEmail: (input: { email: string; displayName: string; activationUrl: string; expiresAt: string }) => Promise<void>
  audit: (input: { actorId: string; action: string; entityType: string; entityId: string; afterSnapshot: unknown }) => Promise<void>
}

type AcceptStaffInviteDeps = {
  getInviteByHash: (tokenHash: string) => Promise<StaffInviteRecord | null>
  activateInvite: (input: { invite: StaffInviteRecord; userId: string }) => Promise<void>
}

export function normalizeStaffInviteRole(value: string): StaffInviteRole {
  if (value !== 'ADMIN' && value !== 'EDITOR') throw new Error('INVITE_ROLE_NOT_ALLOWED')
  return value
}

export function assertStaffInviteTransition(
  invite: Pick<StaffInviteRecord, 'status' | 'expiresAt'>,
  now = new Date(),
) {
  if (invite.status === 'REVOKED') throw new Error('STAFF_INVITE_REVOKED')
  if (invite.status === 'ACCEPTED') throw new Error('STAFF_INVITE_USED')
  if (invite.status === 'EXPIRED' || new Date(invite.expiresAt).getTime() <= now.getTime()) {
    throw new Error('STAFF_INVITE_EXPIRED')
  }
  if (invite.status !== 'INVITED') throw new Error('STAFF_INVITE_INVALID_STATE')
}

export function hashStaffInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createStaffInvite(
  input: { email: string; displayName: string; role: string; scopes?: string[]; canPublish?: boolean; origin: string },
  actorId: string,
  deps: CreateStaffInviteDeps,
  now = new Date(),
) {
  const email = input.email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('INVALID_EMAIL')
  const displayName = input.displayName.trim()
  if (!displayName) throw new Error('DISPLAY_NAME_REQUIRED')
  const role = normalizeStaffInviteRole(input.role)
  const token = (deps.randomToken ?? (() => randomBytes(32).toString('base64url')))()
  const tokenHash = hashStaffInviteToken(token)
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString()
  const record: NewStaffInvite = {
    email,
    displayName,
    role,
    scopes: role === 'EDITOR' ? [...new Set(input.scopes ?? [])] : [],
    canPublish: role === 'EDITOR' && Boolean(input.canPublish),
    tokenHash,
    status: 'INVITED',
    expiresAt,
    invitedBy: actorId,
    createdAt: now.toISOString(),
  }
  const id = await deps.insertInvite(record)
  const nextPath = `/staff-activate?invite=${encodeURIComponent(token)}`
  const activationUrl = await deps.generateAuthInviteLink(email, nextPath)
  await deps.sendInviteEmail({ email, displayName, activationUrl, expiresAt })
  await deps.audit({ actorId, action: 'STAFF_INVITED', entityType: 'staff_invite', entityId: id, afterSnapshot: { email, displayName, role, scopes: record.scopes, canPublish: record.canPublish, expiresAt } })
  return { id, expiresAt }
}

export async function acceptStaffInvite(
  input: { token: string; currentUser: { id: string; email: string } },
  deps: AcceptStaffInviteDeps,
  now = new Date(),
) {
  const tokenHash = hashStaffInviteToken(input.token)
  const invite = await deps.getInviteByHash(tokenHash)
  if (!invite) throw new Error('STAFF_INVITE_NOT_FOUND')
  assertStaffInviteTransition(invite, now)
  if (input.currentUser.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    throw new Error('STAFF_INVITE_IDENTITY_MISMATCH')
  }
  await deps.activateInvite({ invite, userId: input.currentUser.id })
  return { inviteId: invite.id, role: invite.role }
}
