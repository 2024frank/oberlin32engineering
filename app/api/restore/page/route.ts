import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { restorePageVersion } from '@/lib/publishing/pages'

export async function POST(request: Request) {
  const admin=await requireAdmin()
  if (!(can(admin.role,'PUBLISH_CONTENT',admin.scopes,'pages') || (admin.role==='EDITOR' && admin.canPublish && admin.scopes.includes('pages')))) return NextResponse.json({error:'FORBIDDEN'},{status:403})
  const {pageId,versionId}=await request.json() as {pageId?:string;versionId?:string}
  if(!pageId||!versionId) return NextResponse.json({error:'PAGE_AND_VERSION_REQUIRED'},{status:400})
  try{return NextResponse.json({ok:true,versionId:await restorePageVersion(pageId,versionId,admin.userId)})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'RESTORE_FAILED'},{status:400})}
}
