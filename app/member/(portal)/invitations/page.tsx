import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMyTeamInvites } from '@/lib/projects/teamInvites'
import { TeamInvitationList } from '@/components/member/TeamInvitationList'
export default async function InvitationsPage(){const member=await requireActiveMember();return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Team invitations</p><h1>Project invitations</h1><p>You only join a project after you explicitly accept its invitation.</p></div></div><TeamInvitationList initial={await listMyTeamInvites(member.userId)}/></main>}
