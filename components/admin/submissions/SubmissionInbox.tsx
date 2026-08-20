'use client';import { useState } from 'react';import { useToast } from '@/components/ui/Toast'
export type SubmissionRow={id:string;type:string;full_name:string;email:string;payload:Record<string,unknown>;status:string;created_at:string}

// Mirrors startMembershipFromSubmission()'s thrown error codes with copy that explains
// what actually happened, since "Approve failed" alone would not tell the officer why.
const approveErrorLabel:Record<string,string>={
  OBERLIN_EMAIL_REQUIRED:'This submission’s email is not an @oberlin.edu address, so it can’t start the member sign-up flow automatically.',
}
function approveErrorMessage(code:string){
  if(approveErrorLabel[code])return approveErrorLabel[code]
  if(code.startsWith('ALREADY_MEMBER'))return 'This person is already an approved member.'
  if(code.startsWith('MEMBERSHIP_REQUEST_BLOCKED'))return 'A membership request for this email already exists and was rejected or suspended — handle it from Member Applications.'
  return code||'Could not start membership.'
}

export function SubmissionInbox({initialRows}:{initialRows:SubmissionRow[]}){
  const[rows,setRows]=useState(initialRows);const[busyId,setBusyId]=useState('');const toast=useToast()
  async function setStatus(id:string,status:string){const r=await fetch('/api/admin/submissions',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});if(!r.ok){toast('Could not update submission.','error');return}setRows(x=>x.map(v=>v.id===id?{...v,status}:v));toast('Submission updated.')}
  async function approveMembership(id:string){
    setBusyId(id)
    try{
      const r=await fetch('/api/admin/submissions/approve-membership',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id})})
      const body=await r.json()
      if(!r.ok){toast(approveErrorMessage(body.error??''),'error');return}
      setRows(x=>x.map(v=>v.id===id?{...v,status:'approved'}:v))
      toast(body.resent?'Sign-up email re-sent. They’ll appear in Member Applications once they verify.':'Approved — sign-up email sent. They’ll appear in Member Applications once they verify their Oberlin email.')
    } finally { setBusyId('') }
  }
  return <div className="submission-inbox">{rows.length?rows.map(row=><article key={row.id}><header><div><span className="status-pill">{row.status}</span><strong>{row.full_name}</strong><a href={`mailto:${row.email}`}>{row.email}</a></div><time>{new Date(row.created_at).toLocaleString()}</time></header><p className="eyebrow">{row.type.replaceAll('_',' ')}</p><dl>{Object.entries(row.payload??{}).filter(([,v])=>String(v??'').trim()).map(([k,v])=><div key={k}><dt>{k.replaceAll(/([A-Z])/g,' $1')}</dt><dd>{Array.isArray(v)?v.join(', '):String(v)}</dd></div>)}</dl><footer>{row.type==='join_club'&&row.status!=='approved'&&row.status!=='archived'&&<button className="button--cardinal" disabled={busyId===row.id} onClick={()=>approveMembership(row.id)}>{busyId===row.id?'Sending…':'Approve → start membership'}</button>}{row.status==='new'&&<button onClick={()=>setStatus(row.id,'reviewed')}>Mark reviewed</button>}{row.status!=='archived'&&<button onClick={()=>setStatus(row.id,'archived')}>Archive</button>}</footer></article>):<div className="admin-table-empty">No public submissions yet.</div>}</div>
}
