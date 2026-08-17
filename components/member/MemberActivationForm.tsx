'use client'

import { FormEvent, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function MemberActivationForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    try {
      if (password.length < 10) throw new Error('Use at least 10 characters for your password.')
      if (password !== confirmation) throw new Error('Passwords do not match.')
      const supabase = createSupabaseBrowserClient()
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw new Error('Could not set your password. Open your approval email again and retry.')
      const response = await fetch('/api/auth/member/activate', { method: 'POST' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Member activation failed.')
      window.location.assign('/member')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Member activation failed.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="settings-form">
    <label>Choose password<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
    <label>Confirm password<input name="confirmation" type="password" minLength={10} autoComplete="new-password" required /></label>
    <button className="button--cardinal" type="submit" disabled={busy}>{busy ? 'Activating…' : 'Activate member account'}</button>
    {error && <p role="alert">{error}</p>}
  </form>
}
