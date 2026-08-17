import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listPendingProjectProposals, reviewServerProjectProposal } from '@/lib/projects/proposalServer'
export async function GET(){const admin=await requireAdmin();if(admin.role==='EDITOR')return NextResponse.json({error:'FORBIDDEN'},{status:403});return NextResponse.json({proposals:await listPendingProjectProposals()})}
export async function PUT(request:Request){const admin=await requireAdmin();if(admin.role==='EDITOR')return NextResponse.json({error:'FORBIDDEN'},{status:403});try{return NextResponse.json({ok:true,result:await reviewServerProjectProposal(await request.json(),admin.userId)})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'PROJECT_PROPOSAL_REVIEW_FAILED'},{status:400})}}
