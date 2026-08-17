import { describe, expect, it } from 'vitest'
import { filterDirectoryMembers, sanitizeDirectoryMember } from '@/lib/members/directory'

const profile={userId:'u1',displayName:'Ada',oberlinEmail:'ada@oberlin.edu',classYear:2028,major:'Physics',disciplines:['Mechanical'],skills:['CAD'],projectInterests:['Robotics'],availability:'Weekends',portfolioUrl:'https://ada.test',githubUrl:null,linkedinUrl:null}

describe('member directory privacy',()=>{
  it('hides fields excluded by privacy settings and hides email by default',()=>{const result=sanitizeDirectoryMember(profile,{directoryVisible:true,visibleFields:['display_name','skills'],shareContact:false});expect(result?.displayName).toBe('Ada');expect(result?.skills).toEqual(['CAD']);expect(result?.major).toBeUndefined();expect(result?.contactEmail).toBeUndefined()})
  it('removes a member entirely when directory visibility is off',()=>expect(sanitizeDirectoryMember(profile,{directoryVisible:false,visibleFields:['display_name'],shareContact:true})).toBeNull())
  it('exposes contact email only after explicit contact sharing',()=>expect(sanitizeDirectoryMember(profile,{directoryVisible:true,visibleFields:['display_name'],shareContact:true})?.contactEmail).toBe('ada@oberlin.edu'))
  it('filters only fields that are present in sanitized directory results',()=>{const visible=sanitizeDirectoryMember(profile,{directoryVisible:true,visibleFields:['display_name','skills'],shareContact:false})!;expect(filterDirectoryMembers([visible],{skill:'CAD'})).toHaveLength(1);expect(filterDirectoryMembers([visible],{major:'Physics'})).toHaveLength(0)})
})
