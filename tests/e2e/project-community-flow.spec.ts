import { expect,test } from '@playwright/test'
import { hasEnv,loginAdmin,loginMember } from './support'

const required=['E2E_PROJECT_LEAD_EMAIL','E2E_PROJECT_LEAD_PASSWORD','E2E_PROJECT_APPLICANT_EMAIL','E2E_PROJECT_APPLICANT_PASSWORD','E2E_PROJECT_APPLICANT_NAME','E2E_PROJECT_INVITEE_EMAIL','E2E_PROJECT_INVITEE_PASSWORD','E2E_PROJECT_INVITEE_NAME','E2E_STANDARD_ADMIN_EMAIL','E2E_STANDARD_ADMIN_PASSWORD']
test.skip(!hasEnv(...required),'Three active member fixtures plus Admin credentials are required')

test('proposal approval creates a Lead workspace and team updates stay private until Admin publication',async({browser})=>{
  const leadContext=await browser.newContext(),applicantContext=await browser.newContext(),inviteeContext=await browser.newContext(),adminContext=await browser.newContext()
  const lead=await leadContext.newPage(),applicant=await applicantContext.newPage(),invitee=await inviteeContext.newPage(),admin=await adminContext.newPage()
  const stamp=Date.now(),title=`E2E Sensor Project ${stamp}`,updateTitle=`E2E Build Update ${stamp}`

  await loginMember(lead,process.env.E2E_PROJECT_LEAD_EMAIL!,process.env.E2E_PROJECT_LEAD_PASSWORD!)
  await lead.goto('/member/proposals')
  await lead.getByLabel('Project title').fill(title)
  await lead.getByLabel('Short summary').fill('A test project for the OEC collaboration workflow.')
  await lead.getByLabel('What problem are you solving?').fill('Students need a safe end-to-end test of project collaboration and approval.')
  await lead.getByLabel('What should the project accomplish?').fill('Verify proposal, team recruiting, update review, and public publishing boundaries.')
  await lead.getByLabel('Engineering disciplines').fill('Electrical, Mechanical')
  await lead.getByLabel('Who or what skills do you want to recruit?').fill('Prototyping and sensors')
  await lead.getByRole('button',{name:'Submit proposal'}).click()
  await expect(lead.getByText('Proposal submitted for OEC Admin review.')).toBeVisible()

  await loginAdmin(admin,process.env.E2E_STANDARD_ADMIN_EMAIL!,process.env.E2E_STANDARD_ADMIN_PASSWORD!)
  await admin.goto('/admin/project-proposals')
  const proposal=admin.locator('.proposal-review-grid article').filter({hasText:title})
  await proposal.getByRole('button',{name:'Approve & create workspace'}).click()
  await expect(admin.getByText('Project approved; workspace and Project Lead created.')).toBeVisible()

  await admin.goto('/admin/projects')
  await admin.getByRole('button',{name:`Edit ${title}`}).click()
  await admin.getByRole('button',{name:'Save draft'}).click()
  await admin.getByRole('button',{name:'Publish'}).click()
  await expect(admin.getByText('Published to the public site.')).toBeVisible()

  await lead.goto('/member/proposals')
  const approved=lead.locator('.proposal-status-list article').filter({hasText:title})
  await approved.getByRole('link',{name:'Open workspace →'}).click()
  const workspaceUrl=lead.url()
  await expect(lead.getByText('Project Lead workspace')).toBeVisible()
  const publicLink=lead.getByRole('link',{name:'View public project ↗'})
  await expect(publicLink).toBeVisible()
  const publicPath=await publicLink.getAttribute('href')
  expect(publicPath).toBeTruthy()

  await loginMember(applicant,process.env.E2E_PROJECT_APPLICANT_EMAIL!,process.env.E2E_PROJECT_APPLICANT_PASSWORD!)
  await applicant.goto(publicPath!)
  await applicant.getByRole('link',{name:'Apply to join project'}).click()
  await applicant.getByLabel('Why do you want to join?').fill('I want to help test and build the sensor prototype with the team.')
  await applicant.getByLabel('Relevant skills').fill('Sensors, prototyping')
  await applicant.getByRole('button',{name:'Send application'}).click()
  await applicant.waitForURL(/\/member\/applications/)

  await lead.goto(workspaceUrl)
  const application=lead.locator('.workspace-applications article').filter({hasText:process.env.E2E_PROJECT_APPLICANT_NAME!})
  await application.getByRole('button',{name:'Accept'}).click()
  await expect(lead.getByText('Applicant added to the team.')).toBeVisible()

  await lead.goto(workspaceUrl)
  const inviteOption=lead.getByLabel('Member').locator('option').filter({hasText:process.env.E2E_PROJECT_INVITEE_NAME!})
  const inviteeUserId=await inviteOption.getAttribute('value')
  expect(inviteeUserId).toBeTruthy()
  await lead.getByLabel('Member').selectOption(inviteeUserId!)
  await lead.getByLabel('Message').fill('Join the E2E project team and help validate the workflow.')
  await lead.getByRole('button',{name:'Send invitation'}).click()
  await expect(lead.getByText('Invitation sent. The member must accept before joining.')).toBeVisible()

  await loginMember(invitee,process.env.E2E_PROJECT_INVITEE_EMAIL!,process.env.E2E_PROJECT_INVITEE_PASSWORD!)
  await invitee.goto('/member/invitations')
  const invitation=invitee.locator('.invitation-grid article').filter({hasText:title})
  await invitation.getByRole('button',{name:'Accept'}).click()
  await expect(invitee.getByText('You joined the project team.')).toBeVisible()

  await lead.goto(workspaceUrl)
  await lead.getByLabel('Title').fill(updateTitle)
  await lead.getByLabel('Summary').fill('The team completed the E2E collaboration checkpoint and documented the result.')
  await lead.getByRole('button',{name:'Submit for review'}).click()
  await expect(lead.getByText('Update submitted for Admin review. It is not public yet.')).toBeVisible()
  await lead.goto(publicPath!)
  await expect(lead.getByText(updateTitle)).toHaveCount(0)

  await admin.goto('/admin/project-updates')
  const review=admin.locator('.proposal-review-grid article').filter({hasText:updateTitle})
  await review.getByRole('button',{name:'Approve for publish'}).click()
  await expect(admin.getByText('Approved for publishing. Use the Project Updates editor below to publish it.')).toBeVisible()
  await admin.getByRole('button',{name:`Edit ${updateTitle}`}).click()
  await admin.getByRole('button',{name:'Save draft'}).click()
  await admin.getByRole('button',{name:'Publish'}).click()
  await expect(admin.getByText('Published to the public site.')).toBeVisible()

  await lead.goto(publicPath!)
  await expect(lead.getByRole('heading',{name:updateTitle})).toBeVisible()
  await leadContext.close();await applicantContext.close();await inviteeContext.close();await adminContext.close()
})
