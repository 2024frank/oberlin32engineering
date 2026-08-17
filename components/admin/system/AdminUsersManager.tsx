'use client'

import { useState } from 'react'
import type { AdminUserRow } from '@/lib/auth/adminUsers'
import type { AdminRole } from '@/lib/permissions/types'
import { EditorDrawer } from '@/components/admin/EditorDrawer'
import { useToast } from '@/components/ui/Toast'

const scopes = ['pages','projects','project_updates','events','opportunities','news_posts','leaders','resources','documents','sponsors','partner_schools','media']

type StaffInviteSummary = {
  id: string
  email: string
  displayName: string
  role: 'ADMIN' | 'EDITOR'
  scopes: string[]
  canPublish: boolean
  status: 'INVITED' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
}

type Draft = {
  userId?: string
  email: string
  displayName: string
  role: AdminRole
  scopes: string[]
  canPublish: boolean
  active: boolean
}

const blank: Draft = { email: '', displayName: '', role: 'EDITOR', scopes: [], canPublish: false, active: true }

export function AdminUsersManager({ initialUsers, initialInvites }: { initialUsers: AdminUserRow[]; initialInvites: StaffInviteSummary[] }) {
  const [rows, setRows] = useState(initialUsers)
  const [invites, setInvites] = useState(initialInvites)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function reload() {
    const [usersResponse, invitesResponse] = await Promise.all([
      fetch('/api/admin/system/users'),
      fetch('/api/admin/staff/invites'),
    ])
    if (usersResponse.ok) setRows((await usersResponse.json()).users)
    if (invitesResponse.ok) setInvites((await invitesResponse.json()).invites)
  }

  async function submit() {
    if (!draft) return
    setBusy(true)
    try {
      const editing = Boolean(draft.userId)
      const response = await fetch(editing ? '/api/admin/system/users' : '/api/admin/staff/invites', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const body = await response.json()
      if (!response.ok) return toast(body.error ?? 'Officer update failed.', 'error')
      toast(editing ? 'Officer access updated.' : 'Invitation email sent.')
      setDraft(null)
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function revokeInvite(inviteId: string) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/staff/invites?id=${encodeURIComponent(inviteId)}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) return toast(body.error ?? 'Invitation could not be revoked.', 'error')
      toast('Invitation revoked.')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  function toggleScope(scope: string) {
    if (!draft) return
    setDraft({ ...draft, scopes: draft.scopes.includes(scope) ? draft.scopes.filter((item) => item !== scope) : [...draft.scopes, scope] })
  }

  const pendingInvites = invites.filter((invite) => invite.status === 'INVITED')

  return <>
    <div className="system-actions system-actions--top">
      <button className="button--cardinal" type="button" aria-label="Invite officer" onClick={() => setDraft({ ...blank })}>Invite officer</button>
    </div>

    {pendingInvites.length > 0 && <section className="system-section">
      <div className="admin-page-heading"><div><p className="eyebrow">Pending</p><h2>Staff invitations</h2><p>Only people with an active invitation can activate a new staff account.</p></div></div>
      <div className="user-list">
        {pendingInvites.map((invite) => <article key={invite.id}>
          <div><strong>{invite.displayName}</strong><span>{invite.email}</span></div>
          <span className="role-pill">{invite.role}</span>
          <span>Expires {new Date(invite.expiresAt).toLocaleString()}</span>
          <button type="button" disabled={busy} onClick={() => void revokeInvite(invite.id)}>Revoke</button>
        </article>)}
      </div>
    </section>}

    <section className="system-section">
      <div className="admin-page-heading"><div><p className="eyebrow">Active staff</p><h2>Officers &amp; roles</h2></div></div>
      <div className="user-list">
        {rows.map((row) => <article key={row.userId}>
          <div><strong>{row.displayName || row.email}</strong><span>{row.email}</span></div>
          <span className="role-pill">{row.role.replace('_', ' ')}</span>
          <span>{row.active ? 'Active' : 'Suspended'}</span>
          <button type="button" aria-label={`Edit ${row.displayName || row.email}`} onClick={() => setDraft({ userId: row.userId, email: row.email, displayName: row.displayName, role: row.role, scopes: row.scopes, canPublish: row.canPublish, active: row.active })}>Manage</button>
        </article>)}
      </div>
    </section>

    <EditorDrawer open={Boolean(draft)} title={draft?.userId ? 'Manage officer' : 'Invite officer'} description={draft?.userId ? 'Super Admin controls officer roles, scopes, publishing access, and suspension.' : 'New staff must activate from the invitation email before they can enter the officer portal.'} onClose={() => setDraft(null)}>
      {draft && <div className="settings-form">
        <label>Email<input disabled={Boolean(draft.userId)} type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
        <label>Display name<input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label>
        <label>Role<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as AdminRole })}>
          <option value="EDITOR">Editor</option>
          <option value="ADMIN">Admin</option>
          {draft.userId && <option value="SUPER_ADMIN">Super Admin</option>}
        </select></label>
        {draft.role === 'EDITOR' && <>
          <fieldset><legend>Editor scopes</legend><div className="scope-grid">{scopes.map((scope) => <label className="inline-check" key={scope}><input type="checkbox" checked={draft.scopes.includes(scope)} onChange={() => toggleScope(scope)} />{scope.replaceAll('_', ' ')}</label>)}</div></fieldset>
          <label className="inline-check"><input type="checkbox" checked={draft.canPublish} onChange={(event) => setDraft({ ...draft, canPublish: event.target.checked })} />Allow this Editor to publish assigned sections</label>
        </>}
        {draft.userId && <label className="inline-check"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Account active</label>}
        <div className="system-actions"><button className="button--cardinal" disabled={busy} onClick={() => void submit()}>{draft.userId ? 'Save access' : 'Send invitation email'}</button></div>
      </div>}
    </EditorDrawer>
  </>
}
