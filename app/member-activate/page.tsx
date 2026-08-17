import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MemberActivationForm } from '@/components/member/MemberActivationForm'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function MemberActivatePage() {
  return <main className="admin-login"><section className="admin-login__intro"><BrandLogo variant="badge"/><p className="eyebrow">Membership approved</p><h1>Activate your OEC member account.</h1><p>Choose a password now. After activation you can also use passwordless magic-link sign in.</p></section><section className="admin-login__card"><BrandLogo /><h2>Finish account setup</h2><MemberActivationForm /></section></main>
}
