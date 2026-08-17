import type { AdminRole } from '@/lib/permissions/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CurrentAdmin = {
  userId: string
  email: string
  displayName: string
  role: AdminRole
  scopes: string[]
  canPublish: boolean
  active: boolean
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const [{ data: profile }, { data: assignment }] = await Promise.all([
    supabase.from('admin_profiles').select('display_name,active,status').eq('user_id', user.id).maybeSingle(),
    supabase.from('role_assignments').select('role,scopes,can_publish').eq('user_id', user.id).maybeSingle()
  ])
  if (!profile || !assignment || !profile.active || profile.status !== 'ACTIVE') return null

  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: profile.display_name || user.email || 'Officer',
    role: assignment.role as AdminRole,
    scopes: Array.isArray(assignment.scopes) ? assignment.scopes : [],
    canPublish: Boolean(assignment.can_publish),
    active: Boolean(profile.active)
  }
}
