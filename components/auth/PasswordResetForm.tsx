'use client'

import { FormEvent, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { validateNewPassword } from '@/lib/auth/passwordRecovery'

export function PasswordResetForm({ portal }: { portal: 'member' | 'admin' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const password = validateNewPassword(String(form.get('password') ?? ''), String(form.get('confirmation') ?? ''))
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw new Error('This reset link is invalid or expired. Request a new one.')
      await supabase.auth.signOut()
      window.location.assign(`${portal === 'member' ? '/member/login' : '/admin/login'}?status=password_reset`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'PASSWORD_RESET_FAILED'
      setError(message === 'PASSWORD_TOO_SHORT' ? 'Use at least 10 characters for your password.' : message === 'PASSWORD_CONFIRMATION_MISMATCH' ? 'Passwords do not match.' : message)
    } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="settings-form">
    <label>New password<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
    <label>Confirm password<input name="confirmation" type="password" minLength={10} autoComplete="new-password" required /></label>
    <button className="button--cardinal" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Set new password'}</button>
    {error && <p role="alert">{error}</p>}
  </form>
}
