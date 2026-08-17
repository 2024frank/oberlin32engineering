import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getContentDraft, type ContentEntityType } from '@/lib/cms/contentDrafts'
import { projectPublishSchema } from '@/lib/validation/projects'
import { eventPublishSchema } from '@/lib/validation/events'
import { opportunityPublishSchema } from '@/lib/validation/opportunities'
import { resourcePublishSchema } from '@/lib/validation/resources'
import { newsPublishSchema } from '@/lib/validation/news'
import { leaderPublishSchema } from '@/lib/validation/leaders'
import { assertPublishableMediaIds } from '@/lib/cms/media'
import { collectContentMediaIds } from '@/lib/media/references'

const projectUpdateSchema=z.object({projectId:z.string().uuid(),title:z.string().min(1).max(180),summary:z.string().max(700).default(''),body:z.string().max(8000).default(''),milestone:z.string().max(180).default(''),updateDate:z.string().date().nullable().default(null),mediaId:z.string().uuid().nullable().default(null)})
const sponsorSchema=z.object({name:z.string().min(1).max(180),relationshipType:z.string().max(100).default('collaborator'),logoMediaId:z.string().uuid().nullable().default(null),url:z.string().url().or(z.literal('')).default(''),description:z.string().max(2000).default(''),sortOrder:z.number().int().default(100)})
const documentSchema=z.object({title:z.string().min(1).max(180),category:z.string().max(100).default(''),description:z.string().max(2000).default(''),url:z.string().url(),format:z.string().max(50).default(''),sortOrder:z.number().int().default(100)})
const partnerSchoolSchema=z.object({name:z.string().min(1).max(180),shortName:z.string().max(80).default(''),location:z.string().max(180).default(''),officialUrl:z.string().url(),questions:z.array(z.record(z.string(),z.unknown())).default([]),sortOrder:z.number().int().default(100)})
const schemaByType:Record<ContentEntityType,z.ZodTypeAny>={projects:projectPublishSchema,project_updates:projectUpdateSchema,events:eventPublishSchema,opportunities:opportunityPublishSchema,resources:resourcePublishSchema,news_posts:newsPublishSchema,leaders:leaderPublishSchema,sponsors:sponsorSchema,documents:documentSchema,partner_schools:partnerSchoolSchema}

export function validateContentSnapshot(entityType:ContentEntityType,payload:unknown){try{return schemaByType[entityType].parse(payload)}catch{throw new Error('CONTENT_VALIDATION_FAILED')}}

export async function publishContentSnapshot(entityType:ContentEntityType,entityId:string,payload:unknown,actorId:string,restoredFrom?:string|null,useAdmin=false){
  const parsed=validateContentSnapshot(entityType,payload);await assertPublishableMediaIds(collectContentMediaIds(entityType,parsed),useAdmin);const supabase=useAdmin?createSupabaseAdminClient():await createSupabaseServerClient();const{data,error}=await supabase.rpc('publish_content_snapshot',{p_entity_type:entityType,p_entity_id:entityId,p_payload_snapshot:parsed,p_restored_from:restoredFrom??null});if(error)throw new Error(`CONTENT_PUBLISH_FAILED:${error.message}`);if(useAdmin)await createSupabaseAdminClient().from('audit_log').insert({actor_id:actorId,action:'SCHEDULED_PUBLISH',entity_type:entityType,entity_id:entityId,after_snapshot:parsed});return data as string
}
export async function publishContentDraft(entityType:ContentEntityType,entityId:string,actorId:string){const draft=await getContentDraft(entityType,entityId);const version=await publishContentSnapshot(entityType,entityId,draft.payload,actorId);const supabase=await createSupabaseServerClient();await supabase.from('content_drafts').delete().eq('entity_type',entityType).eq('entity_id',entityId).eq('updated_at',draft.updatedAt);return version}
export async function restoreContentVersion(entityType:ContentEntityType,entityId:string,versionId:string,actorId:string){const supabase=await createSupabaseServerClient();const{data,error}=await supabase.from('content_versions').select('snapshot').eq('id',versionId).eq('entity_type',entityType).eq('entity_id',entityId).single();if(error||!data)throw new Error('CONTENT_VERSION_NOT_FOUND');return publishContentSnapshot(entityType,entityId,data.snapshot,actorId,versionId)}
