'use client'

import { useState } from 'react'
import type { MembershipRequestSummary } from '@/lib/auth/memberServer'
import { useToast } from '@/components/ui/Toast'

export function MemberApplicationQueue({ initial }: { initial: MembershipRequestSummary[] }) {
  const [rows, setRows] = useState(initial)
  const [busyId, setBusyId] = useState('')
  const toast = useToast()

  async function decide(requestId: string, decision: 'APPROVE'|'REJECT', note: string) {
    setBusyId(requestId)
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId, decision, note }),
      })
      const body = await response.json()
      if (!response.ok) return toast(body.error ?? 'Membership review failed.', 'error')
      toast(decision === 'APPROVE' ? 'Member approved and activation email sent.' : 'Membership request rejected.')
      const refreshed = await fetch('/api/admin/members?status=PENDING_APPROVAL')
      if (refreshed.ok) setRows((await refreshed.json()).requests)
    } finally { setBusyId('') }
  }

  if (!rows.length) return <div className="empty-state"><h2>No membership requests waiting for review.</h2><p>Verified Oberlin requests will appear here.</p></div>
  return <div className="member-review-list">{rows.map((row) => <MemberReviewRow key={row.id} row={row} busy={busyId === row.id} onDecision={decide}/>)}</div>
}

function MemberReviewRow({ row, busy, onDecision }: { row: MembershipRequestSummary; busy: boolean; onDecision: (id: string, decision: 'APPROVE'|'REJECT', note: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  return <article className="content-card"><p className="eyebrow">Verified Oberlin request</p><h2>{row.displayName}</h2><p>{row.email}</p><p>Verified: {row.emailVerifiedAt ? new Date(row.emailVerifiedAt).toLocaleString() : 'Not recorded'}</p><label>Review note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3}/></label><div className="system-actions"><button className="button--cardinal" disabled={busy} onClick={() => void onDecision(row.id, 'APPROVE', note)}>Approve</button><button disabled={busy} onClick={() => void onDecision(row.id, 'REJECT', note)}>Reject</button></div></article>
}
