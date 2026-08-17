import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { publishPageDraft } from '@/lib/publishing/pages'

export async function POST(request: Request) {
  const admin=await requireAdmin()
  if (!(can(admin.role,'PUBLISH_CONTENT',admin.scopes,'pages') || (admin.role==='EDITOR' && admin.canPublish && admin.scopes.includes('pages')))) return NextResponse.json({error:'FORBIDDEN'},{status:403})
  const { pageId }=await request.json() as {pageId?:string}
  if(!pageId) return NextResponse.json({error:'PAGE_ID_REQUIRED'},{status:400})
  try { const versionId=await publishPageDraft(pageId,admin.userId); return NextResponse.json({ok:true,versionId}) }
  catch(error){ return NextResponse.json({error:error instanceof Error?error.message:'PAGE_PUBLISH_FAILED'},{status:400}) }
}
