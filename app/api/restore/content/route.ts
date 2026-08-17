import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { contentEntityTypes, type ContentEntityType } from '@/lib/cms/contentDrafts'
import { restoreContentVersion } from '@/lib/publishing/content'
export async function POST(request:Request){const admin=await requireAdmin();const{entityType,entityId,versionId}=await request.json() as {entityType?:ContentEntityType;entityId?:string;versionId?:string};if(!entityType||!contentEntityTypes.includes(entityType)||!entityId||!versionId)return NextResponse.json({error:'INVALID_TARGET'},{status:400});const permitted=can(admin.role,'PUBLISH_CONTENT',admin.scopes,entityType)||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes(entityType));if(!permitted)return NextResponse.json({error:'FORBIDDEN'},{status:403});try{return NextResponse.json({ok:true,versionId:await restoreContentVersion(entityType,entityId,versionId,admin.userId)})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'RESTORE_FAILED'},{status:400})}}
