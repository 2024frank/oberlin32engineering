import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureCanonicalEntity } from './adminContent'

export const contentEntityTypes=['projects','project_updates','events','opportunities','resources','news_posts','leaders','sponsors','documents','partner_schools'] as const
export type ContentEntityType=typeof contentEntityTypes[number]
export type ContentDraft<T=unknown>={entityType:ContentEntityType;entityId:string;payload:T;updatedAt:string}

export async function saveContentDraft<T>(entityType:ContentEntityType,entityId:string,payload:T,actorId:string):Promise<void>{
  await ensureCanonicalEntity(entityType,entityId,payload);
  const supabase=await createSupabaseServerClient();const {error}=await supabase.from('content_drafts').upsert({entity_type:entityType,entity_id:entityId,payload,updated_by:actorId,updated_at:new Date().toISOString()});if(error)throw new Error(`CONTENT_DRAFT_SAVE_FAILED:${error.message}`)
}
export async function getContentDraft<T=unknown>(entityType:ContentEntityType,entityId:string):Promise<ContentDraft<T>>{
  const supabase=await createSupabaseServerClient();const {data,error}=await supabase.from('content_drafts').select('payload,updated_at').eq('entity_type',entityType).eq('entity_id',entityId).single();if(error||!data)throw new Error('CONTENT_DRAFT_NOT_FOUND');return{entityType,entityId,payload:data.payload as T,updatedAt:data.updated_at}
}
