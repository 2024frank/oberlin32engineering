import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { deleteRedirect,listRedirects,saveRedirect } from '@/lib/cms/redirects'
export async function GET(){await requireAdmin();return NextResponse.json({redirects:await listRedirects()})}
export async function PUT(request:Request){const admin=await requireAdmin();if(!can(admin.role,'MANAGE_SITE_SETTINGS'))return NextResponse.json({error:'FORBIDDEN'},{status:403});try{const id=await saveRedirect(await request.json(),admin.userId);return NextResponse.json({ok:true,id})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'REDIRECT_SAVE_FAILED'},{status:400})}}
export async function DELETE(request:Request){const admin=await requireAdmin();if(!can(admin.role,'MANAGE_SITE_SETTINGS'))return NextResponse.json({error:'FORBIDDEN'},{status:403});const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({error:'ID_REQUIRED'},{status:400});try{await deleteRedirect(id,admin.userId);return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'REDIRECT_DELETE_FAILED'},{status:400})}}
