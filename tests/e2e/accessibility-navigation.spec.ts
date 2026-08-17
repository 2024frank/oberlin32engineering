import { expect,test } from '@playwright/test'

test('public navigation is keyboard operable with visible focus',async({page})=>{
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link',{name:'Oberlin Engineering Club home'})).toBeFocused()
  await expect(page.getByRole('link',{name:'Oberlin Engineering Club home'})).toHaveCSS('outline-style','solid')
})

test('mobile public menu can be opened and closed without a mouse',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  const menu=page.getByRole('button',{name:'Open navigation'})
  await menu.focus();await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded','true')
  await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveAttribute('aria-expanded','false')
})

test('admin drawer exposes keyboard controls when credentials are available',async({page})=>{
  test.skip(!process.env.E2E_ADMIN_EMAIL||!process.env.E2E_ADMIN_PASSWORD,'Admin credentials are required')
  await page.goto('/admin/login');await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!);await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD!);await page.getByRole('button',{name:'Sign in'}).click();await page.waitForURL(/\/admin(\/|$)/)
  await page.setViewportSize({width:768,height:1024})
  const menu=page.getByRole('button',{name:'Open portal navigation'});await menu.focus();await page.keyboard.press('Enter');await expect(menu).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('button',{name:'Close portal navigation'})).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false')
})


test('member drawer and sign-out control are keyboard reachable when credentials are available',async({page})=>{
  test.skip(!process.env.E2E_SECOND_MEMBER_EMAIL||!process.env.E2E_SECOND_MEMBER_PASSWORD,'Active member credentials are required')
  await page.goto('/member/login')
  const form=page.locator('form').filter({has:page.getByLabel('Password')})
  await form.getByLabel('Oberlin email').fill(process.env.E2E_SECOND_MEMBER_EMAIL!)
  await form.getByLabel('Password').fill(process.env.E2E_SECOND_MEMBER_PASSWORD!)
  await form.getByRole('button',{name:'Sign in'}).click()
  await page.waitForURL(/\/member(\/|$)/)
  await page.setViewportSize({width:390,height:844})
  const menu=page.getByRole('button',{name:'Open member navigation'})
  await menu.focus();await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded','true')
  await page.getByRole('button',{name:'Close member navigation'}).click()
  await page.getByRole('button',{name:'Sign out'}).focus()
  await expect(page.getByRole('button',{name:'Sign out'})).toBeFocused()
})
