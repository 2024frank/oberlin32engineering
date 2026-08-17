import { describe,expect,it } from 'vitest'
import { can } from '@/lib/permissions/can'
import { assertCanChangeSuperAdmin } from '@/lib/auth/adminUsers'
import { validateNavigationDestination } from '@/lib/cms/navigation'
import { validateRedirectInput } from '@/lib/cms/redirects'
import { parseSiteSettings } from '@/lib/cms/siteSettings'

describe('system administration boundaries',()=>{
  it('keeps user and global settings management Super Admin only',()=>{
    expect(can('ADMIN','MANAGE_USERS')).toBe(false)
    expect(can('SUPER_ADMIN','MANAGE_USERS')).toBe(true)
    expect(can('ADMIN','MANAGE_SITE_SETTINGS')).toBe(false)
    expect(can('SUPER_ADMIN','MANAGE_SITE_SETTINGS')).toBe(true)
  })

  it('rejects unsafe navigation and redirect URLs',()=>{
    expect(validateNavigationDestination('/projects',false)).toBe('/projects')
    expect(validateNavigationDestination('https://engineering.example.org',true)).toBe('https://engineering.example.org/')
    expect(()=>validateNavigationDestination('javascript:alert(1)',true)).toThrow('UNSAFE_DESTINATION')
    expect(()=>validateRedirectInput({sourcePath:'/old',destination:'javascript:alert(1)',statusCode:301,active:true})).toThrow('UNSAFE_DESTINATION')
    expect(validateRedirectInput({sourcePath:'/old-path',destination:'/new-path',statusCode:308,active:true}).statusCode).toBe(308)
  })

  it('never allows the final active Super Admin to be demoted or deactivated',()=>{
    expect(()=>assertCanChangeSuperAdmin({targetIsSuperAdmin:true,targetActive:true,nextRole:'ADMIN',nextActive:true,activeSuperAdminCount:1})).toThrow('FINAL_SUPER_ADMIN_REQUIRED')
    expect(()=>assertCanChangeSuperAdmin({targetIsSuperAdmin:true,targetActive:true,nextRole:'SUPER_ADMIN',nextActive:false,activeSuperAdminCount:1})).toThrow('FINAL_SUPER_ADMIN_REQUIRED')
    expect(()=>assertCanChangeSuperAdmin({targetIsSuperAdmin:true,targetActive:true,nextRole:'ADMIN',nextActive:true,activeSuperAdminCount:2})).not.toThrow()
  })

  it('accepts structured site settings but not raw HTML or CSS controls',()=>{
    const parsed=parseSiteSettings({contactEmail:'engineering@oberlin.edu',footerText:'Build together',socialLinks:{instagram:'https://instagram.com/oec'},defaultOgMediaId:null,seoTitlePattern:'%s · OEC',announcement:{enabled:false,text:'',href:''},brand:{badgeMediaId:null,horizontalMediaId:null}})
    expect(parsed.seoTitlePattern).toBe('%s · OEC')
    expect(Object.keys(parsed)).not.toContain('customCss')
    expect(()=>parseSiteSettings({...parsed,customHtml:'<script>alert(1)</script>'})).toThrow()
  })
})
