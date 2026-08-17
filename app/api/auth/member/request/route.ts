import { NextResponse } from 'next/server'
import { submitMembershipRequest } from '@/lib/auth/memberServer'

export async function POST(request: Request) {
  try {
    const result = await submitMembershipRequest(await request.json(), new URL(request.url).origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBERSHIP_REQUEST_FAILED' }, { status: 400 })
  }
}
