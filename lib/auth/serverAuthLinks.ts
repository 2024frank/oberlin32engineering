export type OecEmailOtpType = 'invite' | 'magiclink' | 'recovery'

export function normalizeEmailOtpType(value: string): OecEmailOtpType {
  if (value === 'invite' || value === 'magiclink' || value === 'recovery') return value
  throw new Error('AUTH_LINK_TYPE_INVALID')
}

export function safeAuthNext(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export function buildServerAuthLink(input: {
  origin: string
  tokenHash: string
  type: OecEmailOtpType
  next: string
}) {
  const base = input.origin.replace(/\/$/, '')
  const url = new URL('/auth/email-action', base)
  url.searchParams.set('token_hash', input.tokenHash)
  url.searchParams.set('type', input.type)
  url.searchParams.set('next', safeAuthNext(input.next))
  return url.toString()
}
