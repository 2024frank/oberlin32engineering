import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { verifyServerMembershipRequest } from '@/lib/auth/memberServer'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'VERIFIED_SESSION_REQUIRED' }, { status: 401 })
  try {
    const { requestId } = await request.json()
    if (typeof requestId !== 'string' || !requestId) return NextResponse.json({ error: 'REQUEST_ID_REQUIRED' }, { status: 400 })
    const result = await verifyServerMembershipRequest(requestId, { id: user.id, email: user.email })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBERSHIP_VERIFY_FAILED' }, { status: 400 })
  }
}
