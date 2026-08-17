import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeEmailOtpType, safeAuthNext } from '@/lib/auth/serverAuthLinks'

function authFailure(origin: string, next: string) {
  const fallback = next.startsWith('/member') ? '/member/login?error=auth_link' : '/admin/login?error=auth_link'
  return NextResponse.redirect(new URL(fallback, origin), 303)
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const form = await request.formData()
  const tokenHash = String(form.get('token_hash') ?? '')
  const next = safeAuthNext(String(form.get('next') ?? '/'))
  let type: ReturnType<typeof normalizeEmailOtpType>
  try { type = normalizeEmailOtpType(String(form.get('type') ?? '')) } catch { return authFailure(url.origin, next) }
  if (!tokenHash) return authFailure(url.origin, next)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) return authFailure(url.origin, next)
  return NextResponse.redirect(new URL(next, url.origin), 303)
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url), 303)
}
