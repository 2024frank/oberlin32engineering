import { describe, expect, it } from 'vitest'
import { assertMemberCanActivate, assertMemberCanAccessPortal, assertMembershipCanBeReviewed, isOberlinEmail, normalizeMembershipDecision } from '@/lib/auth/memberLifecycle'

describe('member lifecycle', () => {
  it('accepts only exact oberlin.edu addresses', () => {
    expect(isOberlinEmail('student@oberlin.edu')).toBe(true)
    expect(isOberlinEmail(' Student@Oberlin.edu ')).toBe(true)
    expect(isOberlinEmail('student@sub.oberlin.edu')).toBe(false)
    expect(isOberlinEmail('student@gmail.com')).toBe(false)
    expect(isOberlinEmail('student@oberlin.edu.evil.com')).toBe(false)
  })
  it('permits review only after email verification reaches pending approval', () => {
    expect(() => assertMembershipCanBeReviewed('PENDING_APPROVAL')).not.toThrow()
    expect(() => assertMembershipCanBeReviewed('REQUESTED')).toThrow('MEMBERSHIP_NOT_READY_FOR_REVIEW')
    expect(() => assertMembershipCanBeReviewed('APPROVED')).toThrow('MEMBERSHIP_ALREADY_REVIEWED')
  })
  it('requires approval for activation and active state for portal access', () => {
    expect(() => assertMemberCanActivate('APPROVED')).not.toThrow()
    expect(() => assertMemberCanActivate('PENDING_APPROVAL')).toThrow('MEMBER_NOT_APPROVED')
    expect(() => assertMemberCanAccessPortal('ACTIVE')).not.toThrow()
    expect(() => assertMemberCanAccessPortal('APPROVED')).toThrow('MEMBER_NOT_ACTIVE')
    expect(() => assertMemberCanAccessPortal('SUSPENDED')).toThrow('MEMBER_NOT_ACTIVE')
  })
  it('supports only explicit approve or reject decisions', () => {
    expect(normalizeMembershipDecision('APPROVE')).toBe('APPROVE')
    expect(normalizeMembershipDecision('REJECT')).toBe('REJECT')
    expect(() => normalizeMembershipDecision('MAYBE')).toThrow('INVALID_MEMBERSHIP_DECISION')
  })
})
