import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareFirstSuperAdminBootstrap } from '../../lib/auth/bootstrapPolicy.ts'

test('normalizes a valid first Super Admin bootstrap request', () => {
  assert.deepEqual(prepareFirstSuperAdminBootstrap({
    email: ' Founder@Example.COM ',
    displayName: '  Founding Admin  ',
    activeSuperAdminCount: 0,
  }), { email: 'founder@example.com', displayName: 'Founding Admin' })
})

test('refuses bootstrap after an active Super Admin exists', () => {
  assert.throws(() => prepareFirstSuperAdminBootstrap({
    email: 'founder@example.com',
    displayName: 'Founding Admin',
    activeSuperAdminCount: 1,
  }), /SUPER_ADMIN_ALREADY_BOOTSTRAPPED/)
})

test('rejects malformed bootstrap identity input', () => {
  assert.throws(() => prepareFirstSuperAdminBootstrap({ email: 'not-an-email', displayName: 'Admin', activeSuperAdminCount: 0 }), /VALID_EMAIL_REQUIRED/)
  assert.throws(() => prepareFirstSuperAdminBootstrap({ email: 'admin@example.com', displayName: ' ', activeSuperAdminCount: 0 }), /DISPLAY_NAME_REQUIRED/)
})
