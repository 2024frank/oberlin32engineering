import { NextResponse } from 'next/server'
import { sendActiveMemberPasswordReset } from '@/lib/auth/memberServer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    await sendActiveMemberPasswordReset(String(email ?? ''), new URL(request.url).origin)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PASSWORD_RESET_FAILED'
    if (message === 'ACTIVE_MEMBER_REQUIRED') return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'PASSWORD_RESET_FAILED' }, { status: 500 })
  }
}
