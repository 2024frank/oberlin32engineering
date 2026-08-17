import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { ProjectProposalQueue } from '@/components/admin/projects/ProjectProposalQueue'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listPendingProjectProposals } from '@/lib/projects/proposalServer'
export default async function ProjectProposalsAdminPage(){const admin=await requireAdmin();if(admin.role==='EDITOR')return <AccessDenied title="Admin access required"/>;return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Engineering community</p><h1>Project proposals</h1><p>Approval atomically creates the draft project workspace and makes the proposer Project Lead.</p></div></div><ProjectProposalQueue initial={await listPendingProjectProposals()}/></main>}
