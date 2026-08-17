import { describe, expect, it } from 'vitest'
import { can } from '@/lib/permissions/can'

describe('OEC admin permissions', () => {
  it('gives SUPER_ADMIN full system authority', () => {
    expect(can('SUPER_ADMIN', 'MANAGE_USERS')).toBe(true)
    expect(can('SUPER_ADMIN', 'PUBLISH_CONTENT')).toBe(true)
  })

  it('blocks non-super-admin roles from critical system administration', () => {
    expect(can('ADMIN', 'MANAGE_SITE_SETTINGS')).toBe(false)
    expect(can('EDITOR', 'MANAGE_USERS')).toBe(false)
    expect(can('EDITOR', 'MANAGE_SITE_SETTINGS')).toBe(false)
  })

  it('allows Admin member review without granting staff administration', () => {
    expect(can('ADMIN', 'REVIEW_MEMBERS')).toBe(true)
    expect(can('ADMIN', 'MANAGE_STAFF')).toBe(false)
    expect(can('EDITOR', 'REVIEW_MEMBERS')).toBe(false)
    expect(can('SUPER_ADMIN', 'MANAGE_STAFF')).toBe(true)
  })

  it('allows an editor to edit only an assigned scope', () => {
    expect(can('EDITOR', 'EDIT_CONTENT', ['projects'], 'projects')).toBe(true)
    expect(can('EDITOR', 'EDIT_CONTENT', ['projects'], 'events')).toBe(false)
  })
})
