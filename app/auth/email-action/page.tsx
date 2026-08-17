import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { normalizeEmailOtpType, safeAuthNext } from '@/lib/auth/serverAuthLinks'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function EmailActionPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams
  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : ''
  const rawType = typeof params.type === 'string' ? params.type : ''
  const next = safeAuthNext(typeof params.next === 'string' ? params.next : '/')
  let valid = Boolean(tokenHash)
  let type = ''
  try { type = normalizeEmailOtpType(rawType) } catch { valid = false }

  return <main className="admin-login">
    <section className="admin-login__intro"><BrandLogo variant="badge"/><p className="eyebrow">Secure email action</p><h1>Confirm this OEC email action.</h1><p>Email security scanners can open links automatically. This extra confirmation makes sure the one-time token is used only when you choose to continue.</p></section>
    <section className="admin-login__card"><BrandLogo /><h2>Continue securely</h2>{valid ? <form action="/auth/confirm" method="post" className="settings-form"><input type="hidden" name="token_hash" value={tokenHash}/><input type="hidden" name="type" value={type}/><input type="hidden" name="next" value={next}/><button className="button--cardinal" type="submit">Continue securely</button></form> : <p role="alert">This email action link is incomplete or invalid. Request a new email from OEC.</p>}</section>
  </main>
}
