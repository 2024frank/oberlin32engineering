import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listNavigationForAdmin,replaceNavigation } from '@/lib/cms/navigation'
import { can } from '@/lib/permissions/can'
export async function GET(){await requireAdmin();return NextResponse.json({items:await listNavigationForAdmin()})}
export async function PUT(request:Request){const admin=await requireAdmin();if(!can(admin.role,'MANAGE_SITE_SETTINGS'))return NextResponse.json({error:'FORBIDDEN'},{status:403});try{const body=await request.json();await replaceNavigation(body.items,admin.userId);return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'NAVIGATION_SAVE_FAILED'},{status:400})}}
