import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listMembershipRequests, reviewMembershipRequest } from '@/lib/auth/memberServer'
import type { MembershipStatus } from '@/lib/auth/memberLifecycle'

const allowedStatuses = new Set(['REQUESTED','EMAIL_VERIFIED','PENDING_APPROVAL','APPROVED','REJECTED','ACTIVE','SUSPENDED','ALL'])

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const raw = new URL(request.url).searchParams.get('status') ?? 'PENDING_APPROVAL'
  const status = allowedStatuses.has(raw) ? raw as MembershipStatus | 'ALL' : 'PENDING_APPROVAL'
  return NextResponse.json({ requests: await listMembershipRequests(status) })
}

export async function PUT(request: Request) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    const body = await request.json()
    const result = await reviewMembershipRequest(body, admin.userId, new URL(request.url).origin)
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBERSHIP_REVIEW_FAILED' }, { status: 400 })
  }
}
