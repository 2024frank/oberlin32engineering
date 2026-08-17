'use client'

import { useState } from 'react'

export function MemberVerificationCard({ requestId }: { requestId: string }) {
  const [state, setState] = useState<'idle'|'busy'|'done'>('idle')
  const [error, setError] = useState('')
  async function verify() {
    setState('busy'); setError('')
    try {
      const response = await fetch('/api/auth/member/verify', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Verification failed.')
      setState('done')
    } catch (cause) { setState('idle'); setError(cause instanceof Error ? cause.message : 'Verification failed.') }
  }
  if (state === 'done') return <div role="status"><h2>Oberlin email verified</h2><p>Your request is now waiting for Admin approval. You will receive another email when a decision is made.</p></div>
  return <div className="settings-form"><p>Your signed-in Oberlin identity must match the membership request.</p><button className="button--cardinal" type="button" disabled={state === 'busy'} onClick={() => void verify()}>{state === 'busy' ? 'Verifying…' : 'Verify Oberlin email'}</button>{error && <p role="alert">{error}</p>}</div>
}
