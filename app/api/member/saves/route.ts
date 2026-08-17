import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listSavedItems, setSavedItem } from '@/lib/members/saves'
export async function GET(){const member=await getCurrentMember();if(!member)return NextResponse.json({error:'ACTIVE_MEMBER_REQUIRED'},{status:401});return NextResponse.json({items:await listSavedItems(member.userId)})}
async function mutate(request:Request,saved:boolean){const member=await getCurrentMember();if(!member)return NextResponse.json({error:'ACTIVE_MEMBER_REQUIRED'},{status:401});try{const body=await request.json();const result=await setSavedItem(member.userId,String(body.itemType??''),String(body.itemId??''),saved);return NextResponse.json({ok:true,...result})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'SAVE_ITEM_FAILED'},{status:400})}}
export async function POST(request:Request){return mutate(request,true)}
export async function DELETE(request:Request){return mutate(request,false)}
