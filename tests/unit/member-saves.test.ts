import { describe,expect,it } from 'vitest'
import { normalizeSavedItemType,savedItemKey } from '@/lib/members/saves'
describe('member saves',()=>{it('builds one stable save key per member type and entity',()=>expect(savedItemKey('u1','PROJECT','p1')).toBe('u1:PROJECT:p1'));it('accepts only supported item types',()=>{expect(normalizeSavedItemType('RESOURCE')).toBe('RESOURCE');expect(()=>normalizeSavedItemType('NEWS')).toThrow('SAVED_ITEM_TYPE_INVALID')})})
