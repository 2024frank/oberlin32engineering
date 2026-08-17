import { isOberlinEmail, type MembershipStatus } from './memberLifecycle.ts'

export function assertMemberRecoveryEligible(input: {
  requestedEmail: string
  profileEmail: string
  status: MembershipStatus
}) {
  const requestedEmail = input.requestedEmail.trim().toLowerCase()
  const profileEmail = input.profileEmail.trim().toLowerCase()
  if (!isOberlinEmail(requestedEmail) || input.status !== 'ACTIVE' || requestedEmail !== profileEmail) {
    throw new Error('ACTIVE_MEMBER_REQUIRED')
  }
}

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 10) throw new Error('PASSWORD_TOO_SHORT')
  if (password !== confirmation) throw new Error('PASSWORD_CONFIRMATION_MISMATCH')
  return password
}
