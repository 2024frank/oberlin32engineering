export type MembershipStatus =
  | 'REQUESTED'
  | 'EMAIL_VERIFIED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'SUSPENDED'

export type MembershipDecision = 'APPROVE' | 'REJECT'

export function isOberlinEmail(email: string) {
  return /^[^@\s]+@oberlin\.edu$/i.test(email.trim())
}

export function assertMembershipCanBeReviewed(status: MembershipStatus) {
  if (status === 'APPROVED' || status === 'REJECTED' || status === 'ACTIVE' || status === 'SUSPENDED') {
    throw new Error('MEMBERSHIP_ALREADY_REVIEWED')
  }
  if (status !== 'PENDING_APPROVAL') throw new Error('MEMBERSHIP_NOT_READY_FOR_REVIEW')
}

export function assertMemberCanActivate(status: MembershipStatus) {
  if (status !== 'APPROVED') throw new Error('MEMBER_NOT_APPROVED')
}

export function assertMemberCanAccessPortal(status: MembershipStatus) {
  if (status !== 'ACTIVE') throw new Error('MEMBER_NOT_ACTIVE')
}

export function normalizeMembershipDecision(value: string): MembershipDecision {
  if (value !== 'APPROVE' && value !== 'REJECT') throw new Error('INVALID_MEMBERSHIP_DECISION')
  return value
}
