import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { activateServerMember } from '@/lib/auth/memberServer'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'APPROVED_SESSION_REQUIRED' }, { status: 401 })
  try {
    const result = await activateServerMember({ id: user.id, email: user.email })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBER_ACTIVATION_FAILED' }, { status: 400 })
  }
}
