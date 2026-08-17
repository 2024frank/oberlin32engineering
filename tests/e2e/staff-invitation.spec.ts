import { expect,test } from '@playwright/test'
import { completeEmailAction,hasEnv,loginAdmin,waitForMailboxLink } from './support'

const required=['E2E_SUPER_ADMIN_EMAIL','E2E_SUPER_ADMIN_PASSWORD','E2E_INVITED_EDITOR_EMAIL','E2E_INVITED_EDITOR_PASSWORD','E2E_MAILBOX_API_URL']
test.skip(!hasEnv(...required),'Fresh invited-editor credentials plus E2E mailbox capture are required')

test('Super Admin invite activates an Editor, keeps staff management blocked, and suspension removes access',async({browser,request})=>{
  const superContext=await browser.newContext(),editorContext=await browser.newContext()
  const superPage=await superContext.newPage(),editorPage=await editorContext.newPage()
  const email=process.env.E2E_INVITED_EDITOR_EMAIL!,password=process.env.E2E_INVITED_EDITOR_PASSWORD!
  const startedAt=new Date().toISOString()

  await loginAdmin(superPage,process.env.E2E_SUPER_ADMIN_EMAIL!,process.env.E2E_SUPER_ADMIN_PASSWORD!)
  await superPage.goto('/admin/users')
  await superPage.getByRole('button',{name:'Invite officer'}).click()
  await superPage.getByLabel('Email').fill(email)
  await superPage.getByLabel('Display name').fill('E2E Editor')
  await superPage.getByLabel('Role').selectOption('EDITOR')
  await superPage.getByLabel('projects').check()
  await superPage.getByRole('button',{name:'Send invitation email'}).click()
  await expect(superPage.getByText('Invitation email sent.')).toBeVisible()

  const actionUrl=await waitForMailboxLink(request,{recipient:email,kind:'staff_invitation',after:startedAt})
  await completeEmailAction(editorPage,actionUrl)
  await editorPage.waitForURL(/\/staff-activate/)
  await editorPage.getByLabel('Choose password').fill(password)
  await editorPage.getByLabel('Confirm password').fill(password)
  await editorPage.getByRole('button',{name:'Activate officer account'}).click()
  await editorPage.waitForURL(/\/admin(\/|$)/)
  await editorPage.goto('/admin/users')
  await expect(editorPage.getByRole('heading',{name:'Super Admin access required'})).toBeVisible()

  await superPage.goto('/admin/users')
  const staffRow=superPage.locator('.user-list article').filter({hasText:email})
  await staffRow.getByRole('button',{name:/Edit E2E Editor/}).click()
  await superPage.getByLabel('Account active').uncheck()
  await superPage.getByRole('button',{name:'Save access'}).click()
  await expect(superPage.getByText('Officer access updated.')).toBeVisible()

  await editorPage.goto('/admin')
  await editorPage.waitForURL(/\/admin\/login/)
  await superContext.close();await editorContext.close()
})
