import type { APIRequestContext,Page } from '@playwright/test'

export function hasEnv(...names:string[]){return names.every(name=>Boolean(process.env[name]))}

export async function loginAdmin(page:Page,email:string,password:string){
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button',{name:'Sign in'}).click()
  await page.waitForURL(/\/admin(\/|$)/)
}

export async function loginMember(page:Page,email:string,password:string){
  await page.goto('/member/login')
  const form=page.locator('form').filter({has:page.getByLabel('Password')})
  await form.getByLabel('Oberlin email').fill(email)
  await form.getByLabel('Password').fill(password)
  await form.getByRole('button',{name:'Sign in'}).click()
  await page.waitForURL(/\/member(\/|$)/)
}

export async function waitForMailboxLink(request:APIRequestContext,input:{recipient:string;kind:string;after:string}){
  const base=process.env.E2E_MAILBOX_API_URL!
  const token=process.env.E2E_MAILBOX_API_TOKEN
  const deadline=Date.now()+90_000
  while(Date.now()<deadline){
    const response=await request.get(base,{params:input,headers:token?{authorization:`Bearer ${token}`}:{}})
    if(response.ok()){
      const body=await response.json() as {url?:string}
      if(body.url)return body.url
    }
    await new Promise(resolve=>setTimeout(resolve,1500))
  }
  throw new Error(`E2E mailbox did not return ${input.kind} link for ${input.recipient}`)
}


export async function completeEmailAction(page:Page,url:string){
  await page.goto(url)
  await page.waitForURL(/\/auth\/email-action/)
  await page.getByRole('button',{name:'Continue securely'}).click()
}
