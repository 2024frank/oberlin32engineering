import { requireActiveMember } from '@/lib/auth/memberSession'
import { getMemberProfileSettings } from '@/lib/members/profile'
import { ProfileForm } from '@/components/member/ProfileForm'
export default async function MemberProfilePage(){const member=await requireActiveMember();const profile=await getMemberProfileSettings(member.userId);return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Member identity</p><h1>My profile</h1><p>Keep your engineering interests current and control exactly what other approved members can see.</p></div></div><ProfileForm initial={profile}/></main>}
