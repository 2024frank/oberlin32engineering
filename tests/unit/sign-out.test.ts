import assert from 'node:assert/strict'
import test from 'node:test'
import { portalLoginPath } from '../../lib/auth/signOut.ts'

test('sign out returns each private portal to its own login surface',()=>{
  assert.equal(portalLoginPath('member'),'/member/login')
  assert.equal(portalLoginPath('admin'),'/admin/login')
})
