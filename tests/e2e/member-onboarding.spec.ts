import { expect,test } from '@playwright/test'
import { completeEmailAction,hasEnv,loginAdmin,loginMember,waitForMailboxLink } from './support'

const required=['E2E_NEW_MEMBER_EMAIL','E2E_NEW_MEMBER_PASSWORD','E2E_NEW_MEMBER_NAME','E2E_STANDARD_ADMIN_EMAIL','E2E_STANDARD_ADMIN_PASSWORD','E2E_SECOND_MEMBER_EMAIL','E2E_SECOND_MEMBER_PASSWORD','E2E_MAILBOX_API_URL']
test.skip(!hasEnv(...required),'Fresh Oberlin member identity, second active member, Admin credentials, and mailbox capture are required')

test('verified Oberlin request requires approval, supports password and magic link, and respects directory privacy',async({browser,request})=>{
  const memberContext=await browser.newContext(),adminContext=await browser.newContext(),peerContext=await browser.newContext()
  const member=await memberContext.newPage(),admin=await adminContext.newPage(),peer=await peerContext.newPage()
  const email=process.env.E2E_NEW_MEMBER_EMAIL!,name=process.env.E2E_NEW_MEMBER_NAME!,password=process.env.E2E_NEW_MEMBER_PASSWORD!
  const requestStarted=new Date().toISOString()

  await member.goto('/member/login')
  const requestForm=member.locator('form').filter({has:member.getByRole('button',{name:'Request membership'})})
  await requestForm.getByLabel('Name').fill(name)
  await requestForm.getByLabel('Oberlin email').fill(email)
  await requestForm.getByRole('button',{name:'Request membership'}).click()
  await expect(member.getByText(/Verification email sent/i)).toBeVisible()

  const verificationUrl=await waitForMailboxLink(request,{recipient:email,kind:'membership_verification',after:requestStarted})
  await completeEmailAction(member,verificationUrl)
  await member.waitForURL(/\/member-verify/)
  await member.getByRole('button',{name:'Verify Oberlin email'}).click()
  await expect(member.getByRole('heading',{name:'Oberlin email verified'})).toBeVisible()

  const approvalStarted=new Date().toISOString()
  await loginAdmin(admin,process.env.E2E_STANDARD_ADMIN_EMAIL!,process.env.E2E_STANDARD_ADMIN_PASSWORD!)
  await admin.goto('/admin/member-applications')
  const requestCard=admin.locator('.member-review-list article').filter({hasText:email})
  await requestCard.getByRole('button',{name:'Approve'}).click()
  await expect(admin.getByText('Member approved and activation email sent.')).toBeVisible()

  const activationUrl=await waitForMailboxLink(request,{recipient:email,kind:'membership_approved',after:approvalStarted})
  await completeEmailAction(member,activationUrl)
  await member.waitForURL(/\/member-activate/)
  await member.getByLabel('Choose password').fill(password)
  await member.getByLabel('Confirm password').fill(password)
  await member.getByRole('button',{name:'Activate member account'}).click()
  await member.waitForURL(/\/member(\/|$)/)

  await member.getByRole('button',{name:'Sign out'}).click()
  await member.waitForURL(/\/member\/login/)
  await loginMember(member,email,password)
  await member.getByRole('button',{name:'Sign out'}).click()
  await member.waitForURL(/\/member\/login/)

  const resetStarted=new Date().toISOString()
  const resetForm=member.locator('form').filter({has:member.getByRole('button',{name:'Email me a password reset'})})
  await resetForm.getByLabel('Oberlin email').fill(email)
  await resetForm.getByRole('button',{name:'Email me a password reset'}).click()
  await expect(member.getByText(/If that address belongs to an active OEC member/i)).toBeVisible()
  const resetUrl=await waitForMailboxLink(request,{recipient:email,kind:'member_password_reset',after:resetStarted})
  await completeEmailAction(member,resetUrl)
  await member.waitForURL(/\/member-reset-password/)
  const resetPassword=`${password}-reset`
  await member.getByLabel('New password').fill(resetPassword)
  await member.getByLabel('Confirm password').fill(resetPassword)
  await member.getByRole('button',{name:'Set new password'}).click()
  await member.waitForURL(/\/member\/login/)
  await loginMember(member,email,resetPassword)
  await member.getByRole('button',{name:'Sign out'}).click()
  await member.waitForURL(/\/member\/login/)

  const magicStarted=new Date().toISOString()
  const magicForm=member.locator('form').filter({has:member.getByRole('button',{name:'Email me a magic link'})})
  await magicForm.getByLabel('Oberlin email').fill(email)
  await magicForm.getByRole('button',{name:'Email me a magic link'}).click()
  await expect(member.getByText('Sign-in link sent to your approved Oberlin email.')).toBeVisible()
  const magicUrl=await waitForMailboxLink(request,{recipient:email,kind:'member_magic_link',after:magicStarted})
  await completeEmailAction(member,magicUrl)
  await member.waitForURL(/\/member(\/|$)/)

  const hiddenMajor=`Private Major ${Date.now()}`
  await member.goto('/member/profile')
  await member.getByLabel('Major').fill(hiddenMajor)
  const majorPrivacy=member.locator('label').filter({hasText:'Major'}).filter({has:member.locator('input[type="checkbox"]')}).getByRole('checkbox')
  await majorPrivacy.uncheck()
  await member.getByRole('button',{name:'Save profile'}).click()
  await expect(member.getByText('Profile and directory privacy saved.')).toBeVisible()

  await loginMember(peer,process.env.E2E_SECOND_MEMBER_EMAIL!,process.env.E2E_SECOND_MEMBER_PASSWORD!)
  await peer.goto('/member/directory')
  await peer.getByLabel('Search').fill(name)
  await peer.getByRole('button',{name:'Filter members'}).click()
  const card=peer.locator('.member-card').filter({hasText:name})
  await expect(card).toBeVisible()
  await expect(card).not.toContainText(hiddenMajor)

  await memberContext.close();await adminContext.close();await peerContext.close()
})
