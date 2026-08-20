import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { startMembershipFromSubmission } from '@/lib/auth/memberServer'

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!can(admin.role, 'REVIEW_SUBMISSIONS', admin.scopes, 'submissions')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const { id } = await request.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })

  const s = await createSupabaseServerClient()
  const { data: row, error } = await s.from('submissions').select('id,type,full_name,email,status').eq('id', id).single()
  if (error || !row) return NextResponse.json({ error: 'SUBMISSION_NOT_FOUND' }, { status: 404 })
  if (row.type !== 'join_club') return NextResponse.json({ error: 'NOT_A_JOIN_REQUEST' }, { status: 400 })

  try {
    const origin = new URL(request.url).origin
    const result = await startMembershipFromSubmission({ email: row.email, displayName: row.full_name }, origin)
    await s.from('submissions').update({ status: 'approved' }).eq('id', id)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'APPROVE_FAILED' }, { status: 400 })
  }
}
