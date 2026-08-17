import { createClient } from '@supabase/supabase-js'
import { prepareFirstSuperAdminBootstrap } from '../lib/auth/bootstrapPolicy.ts'
import { buildServerAuthLink } from '../lib/auth/serverAuthLinks.ts'

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_REQUIRED`)
  return value
}

// Typed off the real client factory below rather than `ReturnType<typeof createClient>`,
// whose default generic parameters do not match the client actually constructed.
function createAdminClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

async function findUserByEmail(supabase: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`AUTH_USERS_LOAD_FAILED:${error.message}`)
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email)
    if (match) return match
    if (data.users.length < 200) return null
  }
  throw new Error('AUTH_USER_SEARCH_LIMIT_REACHED')
}

async function sendSetupEmail(input: { supabase: ReturnType<typeof createAdminClient>; email: string; displayName: string; siteUrl: string }) {
  const { data, error } = await input.supabase.auth.admin.generateLink({ type: 'recovery', email: input.email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) throw new Error(`BOOTSTRAP_SETUP_LINK_FAILED:${error?.message ?? 'unknown'}`)
  const setupUrl = buildServerAuthLink({ origin: input.siteUrl, tokenHash, type: 'recovery', next: '/staff-reset-password' })

  const resendKey = required('RESEND_API_KEY')
  const from = required('RESEND_FROM_EMAIL')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: 'Activate the first OEC Super Admin account',
      text: `Hi ${input.displayName},\n\nYour first Oberlin Engineering Club Super Admin account is ready. Use this secure one-time link to choose your password:\n\n${setupUrl}\n\nAfterward, sign in at ${input.siteUrl.replace(/\/$/, '')}/admin/login and invite all other officers from the Super Admin controls.\n\nOberlin Engineering Club`,
    }),
  })
  if (!response.ok) throw new Error(`BOOTSTRAP_EMAIL_FAILED:${response.status}`)
}

async function main() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')
  const siteUrl = required('NEXT_PUBLIC_SITE_URL')
  const rawEmail = required('BOOTSTRAP_SUPER_ADMIN_EMAIL')
  const rawDisplayName = required('BOOTSTRAP_SUPER_ADMIN_DISPLAY_NAME')
  const supabase = createAdminClient(url, serviceRoleKey)

  const { count, error: countError } = await supabase
    .from('role_assignments')
    .select('user_id,admin_profiles!inner(active,status)', { count: 'exact', head: true })
    .eq('role', 'SUPER_ADMIN')
    .eq('admin_profiles.active', true)
    .eq('admin_profiles.status', 'ACTIVE')
  if (countError) throw new Error(`SUPER_ADMIN_COUNT_FAILED:${countError.message}`)
  const identity = prepareFirstSuperAdminBootstrap({ email: rawEmail, displayName: rawDisplayName, activeSuperAdminCount: count ?? 0 })

  let user = await findUserByEmail(supabase, identity.email)
  let createdUserId: string | null = null
  if (!user) {
    const created = await supabase.auth.admin.createUser({ email: identity.email, email_confirm: true, user_metadata: { display_name: identity.displayName } })
    if (created.error || !created.data.user) throw new Error(`BOOTSTRAP_AUTH_USER_FAILED:${created.error?.message ?? 'unknown'}`)
    user = created.data.user
    createdUserId = user.id
  }

  const { data, error } = await supabase.rpc('bootstrap_first_super_admin', { p_user_id: user.id, p_display_name: identity.displayName })
  if (error) {
    if (createdUserId) await supabase.auth.admin.deleteUser(createdUserId)
    throw new Error(`BOOTSTRAP_RPC_FAILED:${error.message}`)
  }

  await sendSetupEmail({ supabase, email: identity.email, displayName: identity.displayName, siteUrl })
  process.stdout.write(`${JSON.stringify({ ok: true, userId: user.id, email: identity.email, role: data?.role ?? 'SUPER_ADMIN' })}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
