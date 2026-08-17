import { expect,test } from '@playwright/test'
import { hasEnv,loginAdmin,loginMember } from './support'

test('ADMIN receives an access-denied screen for officer role management',async({page})=>{
  test.skip(!hasEnv('E2E_STANDARD_ADMIN_EMAIL','E2E_STANDARD_ADMIN_PASSWORD'),'Standard ADMIN E2E credentials are required')
  await loginAdmin(page,process.env.E2E_STANDARD_ADMIN_EMAIL!,process.env.E2E_STANDARD_ADMIN_PASSWORD!)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading',{name:'Super Admin access required'})).toBeVisible()
  await expect(page.getByRole('button',{name:/invite officer/i})).toHaveCount(0)
})

test('EDITOR cannot approve members or manage staff',async({page})=>{
  test.skip(!hasEnv('E2E_EDITOR_EMAIL','E2E_EDITOR_PASSWORD'),'EDITOR E2E credentials are required')
  await loginAdmin(page,process.env.E2E_EDITOR_EMAIL!,process.env.E2E_EDITOR_PASSWORD!)
  await page.goto('/admin/member-applications')
  await expect(page.getByRole('heading',{name:'Admin access required'})).toBeVisible()
  await page.goto('/admin/users')
  await expect(page.getByRole('heading',{name:'Super Admin access required'})).toBeVisible()
})

test('an active member session does not grant officer portal access',async({page})=>{
  test.skip(!hasEnv('E2E_SECOND_MEMBER_EMAIL','E2E_SECOND_MEMBER_PASSWORD'),'Active member E2E credentials are required')
  await loginMember(page,process.env.E2E_SECOND_MEMBER_EMAIL!,process.env.E2E_SECOND_MEMBER_PASSWORD!)
  await page.goto('/admin')
  await page.waitForURL(/\/admin\/login/)
})

test('anonymous visitors are redirected from the member portal',async({page})=>{
  await page.goto('/member/profile')
  await page.waitForURL(/\/member\/login/)
})
