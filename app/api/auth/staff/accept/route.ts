import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { acceptServerStaffInvite } from '@/lib/auth/staffInviteServer'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'AUTHENTICATED_INVITE_SESSION_REQUIRED' }, { status: 401 })
  try {
    const { token } = await request.json()
    if (typeof token !== 'string' || !token) return NextResponse.json({ error: 'INVITE_TOKEN_REQUIRED' }, { status: 400 })
    const result = await acceptServerStaffInvite(token, { id: user.id, email: user.email })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STAFF_INVITE_ACCEPT_FAILED' }, { status: 400 })
  }
}
