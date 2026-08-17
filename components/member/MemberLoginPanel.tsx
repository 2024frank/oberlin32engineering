'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function MemberLoginPanel() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    if (status === 'approval_required') setNotice('Your OEC member account must be approved and active before you can enter the member portal.')
    if (status === 'password_reset') setNotice('Password updated. Sign in with your new password.')
  }, [])
  const [busy, setBusy] = useState('')

  async function passwordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('password'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim().toLowerCase(),
        password: String(form.get('password') ?? ''),
      })
      if (authError) throw new Error('Sign-in failed. Check your Oberlin email and password.')
      router.replace('/member'); router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    } finally { setBusy('') }
  }

  async function magicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('magic'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/member/magic-link', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email') ?? '') }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error === 'ACTIVE_MEMBER_REQUIRED' ? 'That email does not have an active approved OEC member account.' : body.error ?? 'Could not send sign-in link.')
      setNotice('Sign-in link sent to your approved Oberlin email.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send sign-in link.') }
    finally { setBusy('') }
  }



  async function passwordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('reset'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/member/password-reset', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email') ?? '') }),
      })
      if (!response.ok) throw new Error('Could not send a password reset right now.')
      setNotice('If that address belongs to an active OEC member, a password reset link was sent to the Oberlin email.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send password reset.') }
    finally { setBusy('') }
  }

  async function requestMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('request'); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/member/request', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: String(form.get('displayName') ?? ''), email: String(form.get('email') ?? '') }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (String(body.error ?? '').startsWith('MEMBERSHIP_REQUEST_EXISTS:')) throw new Error('A membership request already exists for that Oberlin email.')
        throw new Error(body.error === 'OBERLIN_EMAIL_REQUIRED' ? 'Use your @oberlin.edu email.' : body.error ?? 'Could not submit membership request.')
      }
      setNotice('Verification email sent. Verify your Oberlin email, then an OEC Admin will review your request.')
      event.currentTarget.reset()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit membership request.') }
    finally { setBusy('') }
  }

  return <div className="member-auth-grid">
    <section className="admin-login__card">
      <h2>Member sign in</h2>
      <p>For approved OEC members using an Oberlin email.</p>
      <form onSubmit={passwordSignIn} className="settings-form">
        <label>Oberlin email<input name="email" type="email" pattern="[^@]+@oberlin\.edu" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === 'password' ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="member-auth-divider"><span>or</span></div>
      <form onSubmit={magicLink} className="settings-form">
        <label>Oberlin email<input name="email" type="email" pattern="[^@]+@oberlin\.edu" autoComplete="email" required /></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === 'magic' ? 'Sending…' : 'Email me a magic link'}</button>
      </form>
      <div className="member-auth-divider"><span>password help</span></div>
      <form onSubmit={passwordReset} className="settings-form">
        <label>Oberlin email<input name="email" type="email" pattern="[^@]+@oberlin\.edu" autoComplete="email" required /></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === 'reset' ? 'Sending…' : 'Email me a password reset'}</button>
      </form>
    </section>

    <section className="admin-login__card">
      <p className="eyebrow">Not a member yet?</p>
      <h2>Request an OEC member account</h2>
      <p>You must use a verified @oberlin.edu email. An Admin or Super Admin approves each request before portal access is enabled.</p>
      <form onSubmit={requestMembership} className="settings-form">
        <label>Name<input name="displayName" minLength={2} autoComplete="name" required /></label>
        <label>Oberlin email<input name="email" type="email" pattern="[^@]+@oberlin\.edu" autoComplete="email" required /></label>
        <button className="button--cardinal" type="submit" disabled={Boolean(busy)}>{busy === 'request' ? 'Submitting…' : 'Request membership'}</button>
      </form>
    </section>

    {(error || notice) && <div className="member-auth-message" role={error ? 'alert' : 'status'}>{error || notice}</div>}
  </div>
}
