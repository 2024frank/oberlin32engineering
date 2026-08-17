import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { createServerStaffInvite, listStaffInvites, revokeServerStaffInvite } from '@/lib/auth/staffInviteServer'

export async function GET() {
  const admin = await requireAdmin()
  if (admin.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return NextResponse.json({ invites: await listStaffInvites() })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    const body = await request.json()
    const result = await createServerStaffInvite(body, admin.userId, new URL(request.url).origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STAFF_INVITE_FAILED' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin()
  if (admin.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const inviteId = new URL(request.url).searchParams.get('id')
  if (!inviteId) return NextResponse.json({ error: 'INVITE_ID_REQUIRED' }, { status: 400 })
  try {
    await revokeServerStaffInvite(inviteId, admin.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STAFF_INVITE_REVOKE_FAILED' }, { status: 400 })
  }
}
