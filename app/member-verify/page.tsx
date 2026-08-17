import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MemberVerificationCard } from '@/components/member/MemberVerificationCard'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function MemberVerifyPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams
  const requestId = typeof params.request === 'string' ? params.request : ''
  return <main className="admin-login"><section className="admin-login__intro"><BrandLogo variant="badge"/><p className="eyebrow">Membership verification</p><h1>Verify your Oberlin identity.</h1><p>Verification only moves your request to the review queue. It does not grant member access yet.</p></section><section className="admin-login__card"><BrandLogo variant="badge" /><h2>Email verification</h2>{requestId ? <MemberVerificationCard requestId={requestId}/> : <p role="alert">This verification link is incomplete.</p>}</section></main>
}
