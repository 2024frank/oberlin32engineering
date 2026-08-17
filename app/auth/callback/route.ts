import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNext(url.searchParams.get('next'))
  const loginFallback = next.startsWith('/member') ? '/member/login' : '/admin/login'
  if (!code) return NextResponse.redirect(new URL(`${loginFallback}?error=missing_code`, url.origin))
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL(`${loginFallback}?error=auth_link`, url.origin))
  return NextResponse.redirect(new URL(next, url.origin))
}
