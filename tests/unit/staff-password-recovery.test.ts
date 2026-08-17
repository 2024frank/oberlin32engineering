import test from 'node:test'
import assert from 'node:assert/strict'
import { assertStaffRecoveryEligible } from '../../lib/auth/staffRecovery.ts'

test('allows recovery for the exact active staff identity', () => {
  assert.doesNotThrow(() => assertStaffRecoveryEligible({
    requestedEmail: ' Officer@Example.edu ',
    authEmail: 'officer@example.edu',
    active: true,
    status: 'ACTIVE',
  }))
})

test('blocks inactive, revoked, and mismatched staff identities', () => {
  assert.throws(() => assertStaffRecoveryEligible({ requestedEmail: 'officer@example.edu', authEmail: 'officer@example.edu', active: false, status: 'ACTIVE' }), /ACTIVE_STAFF_REQUIRED/)
  assert.throws(() => assertStaffRecoveryEligible({ requestedEmail: 'officer@example.edu', authEmail: 'officer@example.edu', active: true, status: 'REVOKED' }), /ACTIVE_STAFF_REQUIRED/)
  assert.throws(() => assertStaffRecoveryEligible({ requestedEmail: 'one@example.edu', authEmail: 'two@example.edu', active: true, status: 'ACTIVE' }), /ACTIVE_STAFF_REQUIRED/)
})
