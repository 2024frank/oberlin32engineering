import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { getAdminSiteSettings,saveSiteSettings } from '@/lib/cms/siteSettings'
export async function GET(){const admin=await requireAdmin();if(!can(admin.role,'MANAGE_SITE_SETTINGS'))return NextResponse.json({error:'FORBIDDEN'},{status:403});return NextResponse.json({settings:await getAdminSiteSettings()})}
export async function PUT(request:Request){const admin=await requireAdmin();if(!can(admin.role,'MANAGE_SITE_SETTINGS'))return NextResponse.json({error:'FORBIDDEN'},{status:403});try{await saveSiteSettings(await request.json(),admin.userId);return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'SITE_SETTINGS_SAVE_FAILED'},{status:400})}}
