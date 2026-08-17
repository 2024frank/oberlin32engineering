import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validatePageForPublish } from '@/lib/page-builder/pageService'
import { publishPageSnapshot } from '@/lib/publishing/pages'
import { contentEntityTypes } from '@/lib/cms/contentDrafts'
import { publishContentSnapshot } from '@/lib/publishing/content'

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:'UNAUTHORIZED'},{status:401})
  const admin=createSupabaseAdminClient(); const {data:rows,error}=await admin.rpc('claim_due_publications',{p_limit:20})
  if(error) return NextResponse.json({error:error.message},{status:500})
  const results=[] as Array<{id:string;ok:boolean;error?:string}>
  for(const row of rows??[]){
    try{
      if(row.target_type==='page') await publishPageSnapshot(validatePageForPublish(row.payload_snapshot),row.requested_by,null,true)
      else if(contentEntityTypes.includes(row.target_type)) await publishContentSnapshot(row.target_type,row.target_id,row.payload_snapshot,row.requested_by,null,true)
      else throw new Error('UNSUPPORTED_SCHEDULE_TARGET')
      await admin.from('scheduled_publications').update({processed_at:new Date().toISOString(),failure_message:null}).eq('id',row.id).eq('claim_token',row.claim_token)
      results.push({id:row.id,ok:true})
    }catch(cause){const message=cause instanceof Error?cause.message:'SCHEDULE_FAILED';await admin.from('scheduled_publications').update({failure_message:message,claimed_at:null,claim_token:null}).eq('id',row.id);results.push({id:row.id,ok:false,error:message})}
  }
  return NextResponse.json({processed:results})
}
