import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { contentEntityTypes, type ContentEntityType } from '@/lib/cms/contentDrafts'
import { publishContentDraft } from '@/lib/publishing/content'
import { assertTeamProjectUpdatePublishable } from '@/lib/projects/workspace'
export async function POST(request:Request){const admin=await requireAdmin();const{entityType,entityId}=await request.json() as {entityType?:ContentEntityType;entityId?:string};if(!entityType||!contentEntityTypes.includes(entityType)||!entityId)return NextResponse.json({error:'INVALID_TARGET'},{status:400});const permitted=can(admin.role,'PUBLISH_CONTENT',admin.scopes,entityType)||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes(entityType));if(!permitted)return NextResponse.json({error:'FORBIDDEN'},{status:403});try{if(entityType==='project_updates')await assertTeamProjectUpdatePublishable(entityId,admin.role);return NextResponse.json({ok:true,versionId:await publishContentDraft(entityType,entityId,admin.userId)})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'PUBLISH_FAILED'},{status:400})}}
