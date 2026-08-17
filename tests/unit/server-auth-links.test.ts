import test from 'node:test'
import assert from 'node:assert/strict'
import { buildServerAuthLink, normalizeEmailOtpType, safeAuthNext } from '../../lib/auth/serverAuthLinks.ts'

test('builds a server-verifiable auth link without exposing an access-token fragment', () => {
  const url = new URL(buildServerAuthLink({
    origin: 'https://engineering.example/',
    tokenHash: 'hashed-token',
    type: 'recovery',
    next: '/member-reset-password',
  }))
  assert.equal(url.origin, 'https://engineering.example')
  assert.equal(url.pathname, '/auth/email-action')
  assert.equal(url.searchParams.get('token_hash'), 'hashed-token')
  assert.equal(url.searchParams.get('type'), 'recovery')
  assert.equal(url.searchParams.get('next'), '/member-reset-password')
  assert.equal(url.hash, '')
})

test('allows only email verification types used by OEC flows', () => {
  assert.equal(normalizeEmailOtpType('invite'), 'invite')
  assert.equal(normalizeEmailOtpType('magiclink'), 'magiclink')
  assert.equal(normalizeEmailOtpType('recovery'), 'recovery')
  assert.throws(() => normalizeEmailOtpType('email_change'), /AUTH_LINK_TYPE_INVALID/)
})

test('keeps auth next destinations internal', () => {
  assert.equal(safeAuthNext('/member?tab=teams'), '/member?tab=teams')
  assert.equal(safeAuthNext('https://evil.example'), '/')
  assert.equal(safeAuthNext('//evil.example'), '/')
})
