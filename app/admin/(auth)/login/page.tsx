'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('status') === 'password_reset') setNotice('Password updated. Sign in with your new password.')
  }, [])
  const [busy, setBusy] = useState(false)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') })
      if (authError) throw new Error('Sign-in failed. Check your officer email and password.')
      router.replace('/admin'); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.') }
    finally { setBusy(false) }
  }
  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRecoveryBusy(true); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/staff/password-reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: String(form.get('email') ?? '') }) })
      if (!response.ok) throw new Error('Could not send a password reset right now.')
      setNotice('If that address belongs to an active OEC officer, a password reset link was sent.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send password reset.') }
    finally { setRecoveryBusy(false) }
  }
  return <main className="admin-login"><section className="admin-login__intro"><BrandLogo variant="badge" /><p className="eyebrow">Officer Portal</p><h1>Keep the public site accurate without touching code.</h1><p>Edit content, preview drafts, publish approved updates, and manage the club from one workspace.</p></section><section className="admin-login__card"><BrandLogo /><h2>Officer sign in</h2><form onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><div className="member-auth-divider"><span>password help</span></div><form onSubmit={recover} className="settings-form"><label>Officer email<input name="email" type="email" autoComplete="email" required /></label><button type="submit" disabled={recoveryBusy}>{recoveryBusy ? 'Sending…' : 'Email me a password reset'}</button></form>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</section></main>
}
