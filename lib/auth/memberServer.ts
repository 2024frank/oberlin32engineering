import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isOberlinEmail, normalizeMembershipDecision, type MembershipStatus } from './memberLifecycle'
import { assertMemberRecoveryEligible } from './passwordRecovery'
import { buildServerAuthLink, type OecEmailOtpType } from './serverAuthLinks'
import { sendTransactionalEmail } from '@/lib/email/client'
import { memberMagicLinkEmail,memberPasswordResetEmail,membershipApprovedEmail,membershipRejectedEmail,membershipVerificationEmail } from '@/lib/email/templates'

export type MembershipRequestSummary = {
  id: string
  email: string
  displayName: string
  status: MembershipStatus
  emailVerifiedAt: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
}

async function generateMemberLink(email: string, origin: string, next: string, type: OecEmailOtpType) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.generateLink({ type, email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) throw new Error(`MEMBER_AUTH_LINK_FAILED:${error?.message ?? 'unknown'}`)
  return buildServerAuthLink({ origin, tokenHash, type, next })
}

async function generateVerificationLink(email: string, origin: string, next: string) {
  return generateMemberLink(email, origin, next, 'magiclink')
}

export async function submitMembershipRequest(input: { email: string; displayName: string }, origin: string) {
  const email = input.email.trim().toLowerCase()
  const displayName = input.displayName.trim()
  if (!isOberlinEmail(email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  if (displayName.length < 2) throw new Error('DISPLAY_NAME_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: existing } = await supabase.from('membership_requests').select('id,status').ilike('email', email).maybeSingle()
  if (existing) throw new Error(`MEMBERSHIP_REQUEST_EXISTS:${existing.status}`)
  const { data, error } = await supabase.from('membership_requests').insert({ email, display_name: displayName, status: 'REQUESTED' }).select('id').single()
  if (error || !data) throw new Error(`MEMBERSHIP_REQUEST_CREATE_FAILED:${error?.message ?? 'unknown'}`)
  const nextPath = `/member-verify?request=${encodeURIComponent(data.id)}`
  const verificationUrl = await generateVerificationLink(email, origin, nextPath)
  await sendTransactionalEmail({to:email,message:membershipVerificationEmail({displayName,verificationUrl})})
  return { requestId: data.id, status: 'REQUESTED' as const }
}

// Officer-initiated equivalent of submitMembershipRequest(), for a "join the club"
// public submission an admin has approved. It cannot skip straight to an active member:
// approve_membership_request hard-requires the applicant to have already proven they own
// the @oberlin.edu inbox (auth_user_id set by verify_membership_request), which only
// happens once they click this email's link and sign in. Bypassing that would let anyone
// type in someone else's Oberlin address on the public form and get them "approved".
// So this starts the same verified pipeline the self-serve signup uses: create (or reuse)
// the membership_requests row and send the verification/signup email. The request then
// surfaces in Member Applications once verified, for the final approval.
export async function startMembershipFromSubmission(input: { email: string; displayName: string }, origin: string) {
  const email = input.email.trim().toLowerCase()
  const displayName = input.displayName.trim() || email
  if (!isOberlinEmail(email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: existing } = await supabase.from('membership_requests').select('id,status').ilike('email', email).maybeSingle()

  if (existing) {
    if (existing.status === 'APPROVED' || existing.status === 'ACTIVE') throw new Error(`ALREADY_MEMBER:${existing.status}`)
    if (existing.status === 'REJECTED' || existing.status === 'SUSPENDED') throw new Error(`MEMBERSHIP_REQUEST_BLOCKED:${existing.status}`)
    // REQUESTED / EMAIL_VERIFIED / PENDING_APPROVAL: resend rather than error, so
    // re-clicking Approve on the submission just nudges them again.
    const nextPath = `/member-verify?request=${encodeURIComponent(existing.id)}`
    const verificationUrl = await generateVerificationLink(email, origin, nextPath)
    await sendTransactionalEmail({ to: email, message: membershipVerificationEmail({ displayName, verificationUrl }) })
    return { requestId: existing.id, status: existing.status as MembershipStatus, resent: true }
  }

  const { data, error } = await supabase.from('membership_requests').insert({ email, display_name: displayName, status: 'REQUESTED' }).select('id').single()
  if (error || !data) throw new Error(`MEMBERSHIP_REQUEST_CREATE_FAILED:${error?.message ?? 'unknown'}`)
  const nextPath = `/member-verify?request=${encodeURIComponent(data.id)}`
  const verificationUrl = await generateVerificationLink(email, origin, nextPath)
  await sendTransactionalEmail({ to: email, message: membershipVerificationEmail({ displayName, verificationUrl }) })
  return { requestId: data.id, status: 'REQUESTED' as const, resent: false }
}

export async function verifyServerMembershipRequest(requestId: string, currentUser: { id: string; email: string }) {
  if (!isOberlinEmail(currentUser.email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('verify_membership_request', { p_request_id: requestId, p_user_id: currentUser.id })
  if (error) throw new Error(error.message)
  return data as { request_id: string; status: 'PENDING_APPROVAL' }
}

export async function listMembershipRequests(status: MembershipStatus | 'ALL' = 'PENDING_APPROVAL'): Promise<MembershipRequestSummary[]> {
  const supabase = createSupabaseAdminClient()
  let query = supabase.from('membership_requests').select('id,email,display_name,status,email_verified_at,reviewed_at,review_note,created_at').order('created_at', { ascending: false })
  if (status !== 'ALL') query = query.eq('status', status)
  const { data, error } = await query.limit(200)
  if (error) throw new Error(`MEMBERSHIP_REQUESTS_LOAD_FAILED:${error.message}`)
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status as MembershipStatus,
    emailVerifiedAt: row.email_verified_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  }))
}

export async function reviewMembershipRequest(
  input: { requestId: string; decision: string; note?: string },
  reviewerId: string,
  origin: string,
) {
  const decision = normalizeMembershipDecision(input.decision)
  const supabase = createSupabaseAdminClient()
  if (decision === 'REJECT') {
    const { data, error } = await supabase.rpc('reject_membership_request', { p_request_id: input.requestId, p_reviewer_id: reviewerId, p_review_note: input.note?.trim() || null })
    if (error) throw new Error(error.message)
    const result = data as { email: string; display_name: string; status: 'REJECTED' }
    await sendTransactionalEmail({to:result.email,message:membershipRejectedEmail({displayName:result.display_name,reviewNote:input.note})})
    return result
  }

  const { data, error } = await supabase.rpc('approve_membership_request', { p_request_id: input.requestId, p_reviewer_id: reviewerId, p_review_note: input.note?.trim() || null })
  if (error) throw new Error(error.message)
  const result = data as { email: string; display_name: string; user_id: string; status: 'APPROVED' }
  const activationUrl = await generateMemberLink(result.email, origin, '/member-activate', 'magiclink')
  await sendTransactionalEmail({to:result.email,message:membershipApprovedEmail({displayName:result.display_name,activationUrl})})
  return result
}

export async function activateServerMember(currentUser: { id: string; email: string }) {
  if (!isOberlinEmail(currentUser.email)) throw new Error('OBERLIN_EMAIL_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: profile, error: loadError } = await supabase.from('member_profiles').select('oberlin_email,status').eq('user_id', currentUser.id).maybeSingle()
  if (loadError || !profile) throw new Error('MEMBER_PROFILE_NOT_FOUND')
  if (profile.oberlin_email.toLowerCase() !== currentUser.email.toLowerCase()) throw new Error('MEMBERSHIP_IDENTITY_MISMATCH')
  const { data, error } = await supabase.rpc('activate_member', { p_user_id: currentUser.id })
  if (error) throw new Error(error.message)
  return data as { user_id: string; status: 'ACTIVE' }
}

export async function sendActiveMemberMagicLink(emailInput: string, origin: string) {
  const email = emailInput.trim().toLowerCase()
  if (!isOberlinEmail(email)) throw new Error('ACTIVE_MEMBER_REQUIRED')
  const supabase = createSupabaseAdminClient()
  const { data: profile, error } = await supabase.from('member_profiles').select('display_name,status').ilike('oberlin_email', email).maybeSingle()
  if (error || !profile || profile.status !== 'ACTIVE') throw new Error('ACTIVE_MEMBER_REQUIRED')
  const magicUrl = await generateMemberLink(email, origin, '/member', 'magiclink')
  await sendTransactionalEmail({to:email,message:memberMagicLinkEmail({displayName:profile.display_name,magicUrl})})
}


export async function sendActiveMemberPasswordReset(emailInput: string, origin: string) {
  const email = emailInput.trim().toLowerCase()
  const supabase = createSupabaseAdminClient()
  const { data: profile, error } = await supabase
    .from('member_profiles')
    .select('oberlin_email,display_name,status')
    .ilike('oberlin_email', email)
    .maybeSingle()
  if (error || !profile) throw new Error('ACTIVE_MEMBER_REQUIRED')
  assertMemberRecoveryEligible({ requestedEmail: email, profileEmail: profile.oberlin_email, status: profile.status as MembershipStatus })
  const resetUrl = await generateMemberLink(email, origin, '/member-reset-password', 'recovery')
  await sendTransactionalEmail({ to: email, message: memberPasswordResetEmail({ displayName: profile.display_name, resetUrl }) })
}
