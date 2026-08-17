import { NextResponse } from 'next/server'
import { sendActiveStaffPasswordReset } from '@/lib/auth/staffRecoveryServer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    await sendActiveStaffPasswordReset(String(email ?? ''), new URL(request.url).origin)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PASSWORD_RESET_FAILED'
    // ACTIVE_STAFF_REQUIRED answers ok to avoid revealing which emails are officers.
    if (message === 'ACTIVE_STAFF_REQUIRED') return NextResponse.json({ ok: true })
    // Log server-side only: without this the real cause (mail config, Resend rejection)
    // never surfaces anywhere, which makes delivery failures impossible to diagnose.
    console.error('STAFF_PASSWORD_RESET_FAILED', message)
    return NextResponse.json({ error: 'PASSWORD_RESET_FAILED' }, { status: 500 })
  }
}
