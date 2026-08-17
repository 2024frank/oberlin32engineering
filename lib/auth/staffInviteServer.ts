import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  acceptStaffInvite,
  createStaffInvite,
  hashStaffInviteToken,
  type StaffInviteRecord,
  type StaffInviteRole,
} from './staffInvites'
import { sendTransactionalEmail } from '@/lib/email/client'
import { staffInvitationEmail } from '@/lib/email/templates'
import { buildServerAuthLink } from './serverAuthLinks'

const allowedScopes = ['pages','projects','project_updates','events','opportunities','news_posts','leaders','resources','documents','sponsors','partner_schools','media']

function sanitizeScopes(scopes: string[]) {
  return [...new Set(scopes.filter((scope) => allowedScopes.includes(scope)))]
}

function mapInvite(row: Record<string, unknown>): StaffInviteRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    role: row.role as StaffInviteRole,
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    canPublish: Boolean(row.can_publish),
    tokenHash: String(row.token_hash),
    status: row.status as StaffInviteRecord['status'],
    expiresAt: String(row.expires_at),
    invitedBy: String(row.invited_by),
    createdAt: String(row.created_at),
  }
}

async function sendStaffInviteEmail(input: { email: string; displayName: string; activationUrl: string; expiresAt: string }) {await sendTransactionalEmail({to:input.email,message:staffInvitationEmail(input)})}

export async function listStaffInvites() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('staff_invites')
    .select('id,email,display_name,role,scopes,can_publish,token_hash,status,expires_at,invited_by,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`STAFF_INVITES_LOAD_FAILED:${error.message}`)
  return (data ?? []).map((row) => {
    const invite = mapInvite(row as Record<string, unknown>)
    return {
      id: invite.id,
      email: invite.email,
      displayName: invite.displayName,
      role: invite.role,
      scopes: invite.scopes,
      canPublish: invite.canPublish,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }
  })
}

export async function createServerStaffInvite(
  input: { email: string; displayName: string; role: string; scopes?: string[]; canPublish?: boolean },
  actorId: string,
  origin: string,
) {
  const supabase = createSupabaseAdminClient()
  return createStaffInvite(
    { ...input, scopes: sanitizeScopes(input.scopes ?? []), origin },
    actorId,
    {
      insertInvite: async (row) => {
        const { data, error } = await supabase.from('staff_invites').insert({
          email: row.email,
          display_name: row.displayName,
          role: row.role,
          scopes: row.scopes,
          can_publish: row.canPublish,
          token_hash: row.tokenHash,
          status: row.status,
          expires_at: row.expiresAt,
          invited_by: row.invitedBy,
          created_at: row.createdAt,
        }).select('id').single()
        if (error || !data) {
          if (error?.code === '23505') throw new Error('STAFF_INVITE_ALREADY_PENDING')
          throw new Error(`STAFF_INVITE_CREATE_FAILED:${error?.message ?? 'unknown'}`)
        }
        return data.id
      },
      generateAuthInviteLink: async (email, nextPath) => {
        const { data, error } = await supabase.auth.admin.generateLink({ type: 'invite', email })
        const tokenHash = data?.properties?.hashed_token
        if (error || !tokenHash) throw new Error(`STAFF_AUTH_LINK_FAILED:${error?.message ?? 'unknown'}`)
        return buildServerAuthLink({ origin, tokenHash, type: 'invite', next: nextPath })
      },
      sendInviteEmail: sendStaffInviteEmail,
      audit: async (event) => {
        const { error } = await supabase.from('audit_log').insert({
          actor_id: event.actorId,
          action: event.action,
          entity_type: event.entityType,
          entity_id: event.entityId,
          after_snapshot: event.afterSnapshot,
        })
        if (error) throw new Error(`STAFF_INVITE_AUDIT_FAILED:${error.message}`)
      },
    },
  )
}

export async function revokeServerStaffInvite(inviteId: string, actorId: string) {
  const supabase = createSupabaseAdminClient()
  const { data: invite, error: loadError } = await supabase.from('staff_invites').select('id,email,status').eq('id', inviteId).single()
  if (loadError || !invite) throw new Error('STAFF_INVITE_NOT_FOUND')
  if (invite.status !== 'INVITED') throw new Error('STAFF_INVITE_NOT_REVOCABLE')
  const { error } = await supabase.from('staff_invites').update({ status: 'REVOKED', revoked_at: new Date().toISOString() }).eq('id', inviteId).eq('status', 'INVITED')
  if (error) throw new Error(`STAFF_INVITE_REVOKE_FAILED:${error.message}`)
  await supabase.from('audit_log').insert({ actor_id: actorId, action: 'STAFF_INVITE_REVOKED', entity_type: 'staff_invite', entity_id: inviteId, after_snapshot: { email: invite.email } })
}

export async function acceptServerStaffInvite(token: string, currentUser: { id: string; email: string }) {
  const supabase = createSupabaseAdminClient()
  return acceptStaffInvite(
    { token, currentUser },
    {
      getInviteByHash: async (tokenHash) => {
        const { data, error } = await supabase.from('staff_invites').select('*').eq('token_hash', tokenHash).maybeSingle()
        if (error) throw new Error(`STAFF_INVITE_LOAD_FAILED:${error.message}`)
        return data ? mapInvite(data as Record<string, unknown>) : null
      },
      activateInvite: async ({ invite, userId }) => {
        const { error } = await supabase.rpc('accept_staff_invite', { p_invite_id: invite.id, p_user_id: userId })
        if (error) throw new Error(error.message)
      },
    },
  )
}

export function staffInviteTokenDigest(token: string) {
  return hashStaffInviteToken(token)
}
