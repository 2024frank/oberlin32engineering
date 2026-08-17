'use client'

import { FormEvent, useState } from 'react'
import type { MemberProfileSettings } from '@/lib/members/profile'

const privacyFields = [
  ['display_name','Name'],['class_year','Class year'],['major','Major'],['disciplines','Engineering disciplines'],['skills','Skills'],
  ['project_interests','Project interests'],['availability','Availability'],['portfolio_url','Portfolio'],['github_url','GitHub'],['linkedin_url','LinkedIn'],
] as const

const join = (items: string[]) => items.join(', ')
const split = (value: FormDataEntryValue | null) => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean)

export function ProfileForm({ initial }: { initial: MemberProfileSettings }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    const visibleFields = privacyFields.filter(([key]) => form.get(`visible:${key}`) === 'on').map(([key]) => key)
    const payload = {
      displayName: form.get('displayName'), classYear: form.get('classYear'), major: form.get('major'),
      disciplines: split(form.get('disciplines')), skills: split(form.get('skills')), projectInterests: split(form.get('projectInterests')),
      availability: form.get('availability'), portfolioUrl: form.get('portfolioUrl'), githubUrl: form.get('githubUrl'), linkedinUrl: form.get('linkedinUrl'),
      directoryVisible: form.get('directoryVisible') === 'on', shareContact: form.get('shareContact') === 'on', visibleFields,
    }
    try {
      const response = await fetch('/api/member/profile', { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Profile update failed.')
      setMessage('Profile and directory privacy saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Profile update failed.') }
    finally { setBusy(false) }
  }
  return <form className="member-profile-form" onSubmit={submit}>
    <section className="content-card"><h2>Profile</h2><p>Your Oberlin email is fixed to your approved account and is private by default.</p>
      <label>Oberlin email<input value={initial.email} disabled /></label>
      <label>Name<input name="displayName" defaultValue={initial.displayName} minLength={2} required /></label>
      <div className="member-form-grid"><label>Class year<input name="classYear" type="number" min="2020" max="2100" defaultValue={initial.classYear ?? ''}/></label><label>Major<input name="major" defaultValue={initial.major}/></label></div>
      <label>Engineering disciplines <small>Comma separated</small><input name="disciplines" defaultValue={join(initial.disciplines)} placeholder="Electrical, Mechanical, Robotics"/></label>
      <label>Skills <small>Comma separated</small><input name="skills" defaultValue={join(initial.skills)} placeholder="CAD, Python, PCB design"/></label>
      <label>Project interests <small>Comma separated</small><input name="projectInterests" defaultValue={join(initial.projectInterests)} placeholder="Robotics, sustainability, assistive tech"/></label>
      <label>Availability<textarea name="availability" rows={3} defaultValue={initial.availability} placeholder="Example: Tuesday evenings and weekends"/></label>
      <div className="member-form-grid"><label>Portfolio URL<input name="portfolioUrl" type="url" defaultValue={initial.portfolioUrl}/></label><label>GitHub URL<input name="githubUrl" type="url" defaultValue={initial.githubUrl}/></label></div>
      <label>LinkedIn URL<input name="linkedinUrl" type="url" defaultValue={initial.linkedinUrl}/></label>
    </section>
    <section className="content-card"><h2>Directory privacy</h2><label className="member-toggle"><input name="directoryVisible" type="checkbox" defaultChecked={initial.directoryVisible}/><span>Show me in the private member directory</span></label><p>Choose exactly what approved members can see.</p>
      <div className="member-privacy-grid">{privacyFields.map(([key,label])=><label key={key}><input name={`visible:${key}`} type="checkbox" defaultChecked={initial.visibleFields.includes(key)}/><span>{label}</span></label>)}</div>
      <label className="member-toggle member-toggle--contact"><input name="shareContact" type="checkbox" defaultChecked={initial.shareContact}/><span>Allow approved members to see my Oberlin email</span></label>
    </section>
    <div className="member-profile-actions"><button className="button--cardinal" disabled={busy}>{busy?'Saving…':'Save profile'}</button>{message&&<p role="status">{message}</p>}</div>
  </form>
}
