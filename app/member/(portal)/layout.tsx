import { requireActiveMember } from '@/lib/auth/memberSession'
import { MemberShell } from '@/components/member/MemberShell'
export default async function MemberPortalLayout({children}:{children:React.ReactNode}){const member=await requireActiveMember();return <MemberShell member={{displayName:member.displayName,email:member.email}}>{children}</MemberShell>}
