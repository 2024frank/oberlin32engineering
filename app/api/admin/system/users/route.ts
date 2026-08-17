import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { listAdminUsers, updateAdminUser } from '@/lib/auth/adminUsers'

export async function GET() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'MANAGE_USERS')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return NextResponse.json({ users: await listAdminUsers() })
}

export async function POST() {
  return NextResponse.json({ error: 'USE_STAFF_INVITATIONS' }, { status: 410 })
}

export async function PUT(request: Request) {
  const admin = await requireAdmin()
  if (!can(admin.role, 'MANAGE_USERS')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    await updateAdminUser(await request.json(), admin.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ADMIN_UPDATE_FAILED' }, { status: 400 })
  }
}
