import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { PasswordResetForm } from '@/components/auth/PasswordResetForm'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function MemberResetPasswordPage() {
  return <main className="admin-login"><section className="admin-login__intro"><BrandLogo variant="badge"/><p className="eyebrow">Member security</p><h1>Choose a new OEC member password.</h1><p>This page works only after opening the secure recovery link sent to your approved Oberlin email.</p></section><section className="admin-login__card"><BrandLogo /><h2>Reset password</h2><PasswordResetForm portal="member" /></section></main>
}
