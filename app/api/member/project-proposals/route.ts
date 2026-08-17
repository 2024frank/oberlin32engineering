import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listMyProjectProposals, submitProjectProposal } from '@/lib/projects/proposalServer'
export async function GET(){const member=await getCurrentMember();if(!member)return NextResponse.json({error:'ACTIVE_MEMBER_REQUIRED'},{status:401});return NextResponse.json({proposals:await listMyProjectProposals(member.userId)})}
export async function POST(request:Request){const member=await getCurrentMember();if(!member)return NextResponse.json({error:'ACTIVE_MEMBER_REQUIRED'},{status:401});try{return NextResponse.json({ok:true,proposal:await submitProjectProposal(member.userId,await request.json())})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'PROJECT_PROPOSAL_CREATE_FAILED'},{status:400})}}
