import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AdminRole } from '@/lib/permissions/types'

export type AdminUserRow = {
  userId: string
  email: string
  displayName: string
  role: AdminRole
  scopes: string[]
  canPublish: boolean
  active: boolean
  createdAt: string
}

export function assertCanChangeSuperAdmin(input: {
  targetIsSuperAdmin: boolean
  targetActive: boolean
  nextRole: AdminRole
  nextActive: boolean
  activeSuperAdminCount: number
}) {
  const removesActiveSuper = input.targetIsSuperAdmin && input.targetActive && (!input.nextActive || input.nextRole !== 'SUPER_ADMIN')
  if (removesActiveSuper && input.activeSuperAdminCount <= 1) throw new Error('FINAL_SUPER_ADMIN_REQUIRED')
}

const allowedScopes = ['pages','projects','project_updates','events','opportunities','news_posts','leaders','resources','documents','sponsors','partner_schools','media']

function sanitizeScopes(scopes: unknown) {
  return Array.isArray(scopes) ? [...new Set(scopes.map(String).filter((scope) => allowedScopes.includes(scope)))] : []
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createSupabaseAdminClient()
  const [{ data: profiles, error }, { data: authPage }] = await Promise.all([
    supabase.from('admin_profiles').select('user_id,display_name,active,status,created_at,role_assignments(role,scopes,can_publish)').order('created_at'),
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ])
  if (error) throw new Error(`ADMIN_USERS_LOAD_FAILED:${error.message}`)
  const emails = new Map((authPage?.users ?? []).map((user) => [user.id, user.email ?? '']))
  return (profiles ?? []).map((row: any) => ({
    userId: row.user_id,
    email: emails.get(row.user_id) ?? '',
    displayName: row.display_name,
    role: (row.role_assignments?.role ?? 'EDITOR') as AdminRole,
    scopes: row.role_assignments?.scopes ?? [],
    canPublish: Boolean(row.role_assignments?.can_publish),
    active: Boolean(row.active) && row.status !== 'SUSPENDED' && row.status !== 'REVOKED',
    createdAt: row.created_at,
  }))
}

export async function updateAdminUser(
  input: { userId: string; displayName: string; role: AdminRole; scopes?: string[]; canPublish?: boolean; active: boolean },
  actorId: string,
) {
  if (!['SUPER_ADMIN','ADMIN','EDITOR'].includes(input.role)) throw new Error('INVALID_ROLE')
  const supabase = createSupabaseAdminClient()
  const { data: profile, error } = await supabase
    .from('admin_profiles')
    .select('user_id,display_name,active,status,role_assignments(role,scopes,can_publish)')
    .eq('user_id', input.userId)
    .single()
  if (error || !profile) throw new Error('ADMIN_USER_NOT_FOUND')
  const assignment = (profile as any).role_assignments
  const { count } = await supabase
    .from('admin_profiles')
    .select('user_id,role_assignments!inner(role)', { count: 'exact', head: true })
    .eq('active', true)
    .eq('status', 'ACTIVE')
    .eq('role_assignments.role', 'SUPER_ADMIN')
  assertCanChangeSuperAdmin({
    targetIsSuperAdmin: assignment?.role === 'SUPER_ADMIN',
    targetActive: Boolean(profile.active) && (profile as any).status === 'ACTIVE',
    nextRole: input.role,
    nextActive: input.active,
    activeSuperAdminCount: count ?? 0,
  })
  const { error: profileError } = await supabase
    .from('admin_profiles')
    .update({ display_name: input.displayName.trim(), active: input.active, status: input.active ? 'ACTIVE' : 'SUSPENDED' })
    .eq('user_id', input.userId)
  if (profileError) throw new Error(`ADMIN_PROFILE_FAILED:${profileError.message}`)
  const scopes = sanitizeScopes(input.scopes)
  const { error: roleError } = await supabase
    .from('role_assignments')
    .update({ role: input.role, scopes, can_publish: input.role === 'EDITOR' && Boolean(input.canPublish) })
    .eq('user_id', input.userId)
  if (roleError) throw new Error(`ADMIN_ROLE_FAILED:${roleError.message}`)
  await supabase.from('audit_log').insert({
    actor_id: actorId,
    action: 'ADMIN_ACCESS_UPDATED',
    entity_type: 'admin_user',
    entity_id: input.userId,
    before_snapshot: profile,
    after_snapshot: { displayName: input.displayName, role: input.role, scopes, canPublish: input.canPublish, active: input.active },
  })
}
