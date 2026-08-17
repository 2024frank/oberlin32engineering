import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { submitTeamProjectUpdate } from '@/lib/projects/workspace'
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){const member=await getCurrentMember();if(!member)return NextResponse.json({error:'ACTIVE_MEMBER_REQUIRED'},{status:401});try{const{projectId}=await params;return NextResponse.json({ok:true,result:await submitTeamProjectUpdate(projectId,await request.json())})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'PROJECT_UPDATE_SUBMIT_FAILED'},{status:400})}}
