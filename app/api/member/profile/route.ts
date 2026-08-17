import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getMemberProfileSettings, updateMemberProfile } from '@/lib/members/profile'

export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  return NextResponse.json({ profile: await getMemberProfileSettings(member.userId) })
}

export async function PUT(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try {
    await updateMemberProfile(await request.json(), member.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBER_PROFILE_UPDATE_FAILED' }, { status: 400 })
  }
}
