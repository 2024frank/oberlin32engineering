import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/client'
import { staffPasswordResetEmail } from '@/lib/email/templates'
import { assertStaffRecoveryEligible, type StaffAccountStatus } from './staffRecovery'
import { buildServerAuthLink } from './serverAuthLinks'

async function findAuthUserByEmail(email: string) {
  const supabase = createSupabaseAdminClient()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`AUTH_USERS_LOAD_FAILED:${error.message}`)
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email)
    if (match) return match
    if (data.users.length < 200) return null
  }
  throw new Error('AUTH_USER_SEARCH_LIMIT_REACHED')
}

export async function sendActiveStaffPasswordReset(emailInput: string, origin: string) {
  const email = emailInput.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('ACTIVE_STAFF_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const authUser = await findAuthUserByEmail(email)
  if (!authUser?.email) throw new Error('ACTIVE_STAFF_REQUIRED')
  const { data: profile, error } = await supabase
    .from('admin_profiles')
    .select('display_name,active,status')
    .eq('user_id', authUser.id)
    .maybeSingle()
  if (error || !profile) throw new Error('ACTIVE_STAFF_REQUIRED')
  assertStaffRecoveryEligible({ requestedEmail: email, authEmail: authUser.email, active: Boolean(profile.active), status: profile.status as StaffAccountStatus })
  const { data, error: linkError } = await supabase.auth.admin.generateLink({ type: 'recovery', email })
  const tokenHash = data?.properties?.hashed_token
  if (linkError || !tokenHash) throw new Error(`STAFF_RECOVERY_LINK_FAILED:${linkError?.message ?? 'unknown'}`)
  const resetUrl = buildServerAuthLink({ origin, tokenHash, type: 'recovery', next: '/staff-reset-password' })
  await sendTransactionalEmail({ to: email, message: staffPasswordResetEmail({ displayName: profile.display_name, resetUrl }) })
}
