import { NextResponse } from 'next/server'
import { sendActiveMemberMagicLink } from '@/lib/auth/memberServer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    await sendActiveMemberMagicLink(String(email ?? ''), new URL(request.url).origin)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MAGIC_LINK_FAILED'
    const status = message === 'ACTIVE_MEMBER_REQUIRED' ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
