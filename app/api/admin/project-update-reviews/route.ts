import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listAdminTeamUpdateReviews,reviewTeamProjectUpdate } from '@/lib/projects/workspace'
export async function GET(){const admin=await requireAdmin();if(admin.role==='EDITOR')return NextResponse.json({error:'FORBIDDEN'},{status:403});return NextResponse.json({reviews:await listAdminTeamUpdateReviews()})}
export async function PUT(request:Request){const admin=await requireAdmin();if(admin.role==='EDITOR')return NextResponse.json({error:'FORBIDDEN'},{status:403});try{const body=await request.json();return NextResponse.json({ok:true,result:await reviewTeamProjectUpdate(String(body.updateId??''),String(body.decision??''),body.feedback)})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'TEAM_UPDATE_REVIEW_FAILED'},{status:400})}}
