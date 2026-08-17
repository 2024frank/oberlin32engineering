import test from 'node:test'
import assert from 'node:assert/strict'
import { assertMemberRecoveryEligible, validateNewPassword } from '../../lib/auth/passwordRecovery.ts'

test('allows password recovery only for the exact active Oberlin member identity', () => {
  assert.doesNotThrow(() => assertMemberRecoveryEligible({
    requestedEmail: ' Student@oberlin.edu ',
    profileEmail: 'student@oberlin.edu',
    status: 'ACTIVE',
  }))
})

test('blocks non-Oberlin, inactive, and mismatched member recovery', () => {
  assert.throws(() => assertMemberRecoveryEligible({ requestedEmail: 'student@gmail.com', profileEmail: 'student@gmail.com', status: 'ACTIVE' }), /ACTIVE_MEMBER_REQUIRED/)
  assert.throws(() => assertMemberRecoveryEligible({ requestedEmail: 'student@oberlin.edu', profileEmail: 'student@oberlin.edu', status: 'APPROVED' }), /ACTIVE_MEMBER_REQUIRED/)
  assert.throws(() => assertMemberRecoveryEligible({ requestedEmail: 'one@oberlin.edu', profileEmail: 'two@oberlin.edu', status: 'ACTIVE' }), /ACTIVE_MEMBER_REQUIRED/)
})

test('new passwords require ten characters and an exact confirmation', () => {
  assert.equal(validateNewPassword('engineering2026', 'engineering2026'), 'engineering2026')
  assert.throws(() => validateNewPassword('short', 'short'), /PASSWORD_TOO_SHORT/)
  assert.throws(() => validateNewPassword('engineering2026', 'engineering2027'), /PASSWORD_CONFIRMATION_MISMATCH/)
})
