import 'server-only'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertPublishableImageMetadata,type ImageSourceType } from '@/lib/media/imagePolicy'
import { collectContentMediaIds,collectPageMediaIds,type MediaBearingContentType } from '@/lib/media/references'

export type MediaAsset={
  id:string;fileName:string;storagePath:string;publicUrl:string;mimeType:string;sizeBytes:number;altText:string;caption:string;tags:string[];
  width:number|null;height:number|null;protected:boolean;contentHash:string|null;sourceType:ImageSourceType;rightsNote:string|null;
  focalX:number|null;focalY:number|null;visualQaApproved:boolean
}
export type MediaValidation={ok:true}|{ok:false;reason:'UNSUPPORTED_TYPE'|'FILE_TOO_LARGE'}
export type MediaMetadataInput={altText:string;caption?:string;tags?:string[];sourceType?:ImageSourceType;rightsNote?:string|null;focalX?:number|null;focalY?:number|null;visualQaApproved?:boolean}
const allowed=new Set(['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
const sourceTypes=new Set<ImageSourceType>(['original','licensed','generated'])
const MAX_SIZE=15*1024*1024
export function validateMediaUpload({mime,size}:{mime:string;size:number}):MediaValidation{if(!allowed.has(mime))return{ok:false,reason:'UNSUPPORTED_TYPE'};if(size>MAX_SIZE)return{ok:false,reason:'FILE_TOO_LARGE'};return{ok:true}}
function validateSourceType(value:unknown):ImageSourceType{if(typeof value==='string'&&sourceTypes.has(value as ImageSourceType))return value as ImageSourceType;throw new Error('INVALID_MEDIA_SOURCE_TYPE')}
function validateFocal(value:number|null|undefined){if(value==null)return null;if(!Number.isFinite(value)||value<0||value>1)throw new Error('INVALID_FOCAL_POINT');return value}
const map=(r:any):MediaAsset=>({id:r.id,fileName:r.file_name,storagePath:r.storage_path,publicUrl:r.public_url,mimeType:r.mime_type,sizeBytes:Number(r.size_bytes),altText:r.alt_text,caption:r.caption,tags:r.tags??[],width:r.width,height:r.height,protected:Boolean(r.protected),contentHash:r.content_hash,sourceType:r.source_type??'original',rightsNote:r.rights_note??null,focalX:r.focal_x==null?null:Number(r.focal_x),focalY:r.focal_y==null?null:Number(r.focal_y),visualQaApproved:Boolean(r.visual_qa_approved)})
export async function listMedia(query=''):Promise<MediaAsset[]>{const s=await createSupabaseServerClient();let q=s.from('media').select('*').order('created_at',{ascending:false}).limit(100);if(query.trim())q=q.ilike('file_name',`%${query.trim()}%`);const{data,error}=await q;if(error)throw new Error(`MEDIA_LIST_FAILED:${error.message}`);return(data??[]).map(map)}
export type MediaUsageRef={ownerType:string;ownerId:string;fieldKey:string}

// media_usage exists in the schema but nothing writes to it, so it always reads empty -
// the "in use" delete guard would silently never fire. This scans every place a media id
// can actually be referenced today (published content, saved drafts, CMS page sections
// and versions, and site_settings) instead of trusting a side table nobody maintains.
// It reuses the same field-mapping helpers publish-time validation uses, so the two stay
// in sync if a content type gains an image field later.
const canonicalMediaColumn:Partial<Record<MediaBearingContentType,string>>={projects:'cover_media_id',project_updates:'media_id',events:'cover_media_id',news_posts:'cover_media_id',leaders:'photo_media_id',sponsors:'logo_media_id'}

export async function getMediaUsage(mediaId:string):Promise<MediaUsageRef[]>{
  // Several of the tables below are RLS-scoped per content type (private.has_scope(entity_type)),
  // so an officer whose scopes cover only 'media' would see an incomplete - silently empty -
  // result from the officer-session client and the delete guard could miss a real reference.
  // This is a read-only integrity check already gated by requireAdmin()+hasMediaAccess() at the
  // API layer, so it runs with full visibility rather than the caller's own scopes.
  const s=createSupabaseAdminClient()
  const refs:MediaUsageRef[]=[]

  await Promise.all(Object.entries(canonicalMediaColumn).map(async([table,column])=>{
    const{data}=await s.from(table).select('id').eq(column,mediaId).limit(1)
    if(data?.length)refs.push({ownerType:table,ownerId:data[0].id,fieldKey:column})
  }))

  const{data:drafts}=await s.from('content_drafts').select('entity_type,entity_id,payload')
  for(const draft of drafts??[]){
    if(collectContentMediaIds(draft.entity_type as MediaBearingContentType,draft.payload).includes(mediaId))
      refs.push({ownerType:`${draft.entity_type}_draft`,ownerId:draft.entity_id,fieldKey:'draft'})
  }

  const{data:pages}=await s.from('pages').select('id,slug')
  const pageSlugById=new Map((pages??[]).map(p=>[p.id,p.slug]))

  const{data:sections}=await s.from('page_sections').select('page_id,stable_key,draft_payload')
  for(const section of sections??[]){
    const payload=section.draft_payload as{imageId?:unknown;images?:Array<{mediaId?:unknown}>}
    const ids=[payload?.imageId,...(Array.isArray(payload?.images)?payload.images.map(i=>i?.mediaId):[])].filter((v):v is string=>typeof v==='string')
    if(ids.includes(mediaId))refs.push({ownerType:'page_draft',ownerId:pageSlugById.get(section.page_id)??section.page_id,fieldKey:section.stable_key})
  }

  const{data:drafts2}=await s.from('page_drafts').select('page_id,og_media_id')
  for(const draft of drafts2??[]){
    if(draft.og_media_id===mediaId)refs.push({ownerType:'page_draft',ownerId:pageSlugById.get(draft.page_id)??draft.page_id,fieldKey:'ogMediaId'})
  }

  const{data:versions}=await s.from('page_versions').select('page_id,page_snapshot,sections_snapshot')
  for(const version of versions??[]){
    const snapshot=version.page_snapshot as{ogMediaId?:unknown}
    if(collectPageMediaIds({ogMediaId:snapshot?.ogMediaId,sections:version.sections_snapshot}).includes(mediaId))
      refs.push({ownerType:'page',ownerId:pageSlugById.get(version.page_id)??version.page_id,fieldKey:'published'})
  }

  const{data:settings}=await s.from('site_settings').select('key,value').in('key',['brand','seo'])
  for(const row of settings??[]){
    const value=row.value as Record<string,unknown>
    const ids=row.key==='brand'?[value.badgeMediaId,value.horizontalMediaId]:[value.defaultOgMediaId]
    if(ids.includes(mediaId))refs.push({ownerType:'site_settings',ownerId:row.key,fieldKey:row.key})
  }

  return refs
}
export async function updateMediaMetadata(id:string,input:MediaMetadataInput):Promise<MediaAsset>{const s=await createSupabaseServerClient();const sourceType=input.sourceType?validateSourceType(input.sourceType):undefined;const patch:any={alt_text:input.altText,caption:input.caption??'',tags:input.tags??[]};if(sourceType)patch.source_type=sourceType;if(input.rightsNote!==undefined)patch.rights_note=input.rightsNote?.trim()||null;if(input.focalX!==undefined)patch.focal_x=validateFocal(input.focalX);if(input.focalY!==undefined)patch.focal_y=validateFocal(input.focalY);if(input.visualQaApproved!==undefined)patch.visual_qa_approved=Boolean(input.visualQaApproved);if(sourceType&&sourceType!=='generated')patch.visual_qa_approved=false;const{data,error}=await s.from('media').update(patch).eq('id',id).select('*').single();if(error||!data)throw new Error(`MEDIA_UPDATE_FAILED:${error?.message??'unknown'}`);return map(data)}
export async function uploadMedia(file:File,actorId:string,metadata?:{sourceType?:ImageSourceType}):Promise<MediaAsset>{const check=validateMediaUpload({mime:file.type,size:file.size});if(!check.ok)throw new Error(check.reason);const sourceType=metadata?.sourceType?validateSourceType(metadata.sourceType):'original';const bytes=Buffer.from(await file.arrayBuffer());const hash=createHash('sha256').update(bytes).digest('hex');let width:number|null=null,height:number|null=null;if(file.type.startsWith('image/')){try{const meta=await sharp(bytes).metadata();width=meta.width??null;height=meta.height??null}catch{throw new Error('INVALID_IMAGE')}}const s=await createSupabaseServerClient();const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'upload';const path=`${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safe}`;const{error:uploadError}=await s.storage.from('oec-media').upload(path,bytes,{contentType:file.type,upsert:false});if(uploadError)throw new Error(`MEDIA_UPLOAD_FAILED:${uploadError.message}`);const publicUrl=s.storage.from('oec-media').getPublicUrl(path).data.publicUrl;const{data,error}=await s.from('media').insert({file_name:file.name,storage_path:path,public_url:publicUrl,mime_type:file.type,size_bytes:file.size,width,height,content_hash:hash,uploaded_by:actorId,source_type:sourceType,visual_qa_approved:false}).select('*').single();if(error||!data){await s.storage.from('oec-media').remove([path]);throw new Error(`MEDIA_METADATA_FAILED:${error?.message??'unknown'}`)}return map(data)}
export async function assertPublishableMediaIds(ids:string[],useAdmin=false):Promise<void>{if(!ids.length)return;const unique=[...new Set(ids)];const s=useAdmin?createSupabaseAdminClient():await createSupabaseServerClient();const{data,error}=await s.from('media').select('id,mime_type,alt_text,source_type,rights_note,visual_qa_approved').in('id',unique);if(error)throw new Error(`MEDIA_VALIDATION_FAILED:${error.message}`);const rows=data??[];const found=new Set(rows.map((row:any)=>row.id));if(unique.some(id=>!found.has(id)))throw new Error('MEDIA_NOT_FOUND');for(const row of rows){assertPublishableImageMetadata({mimeType:row.mime_type,altText:row.alt_text??'',sourceType:(row.source_type??'original') as ImageSourceType,rightsNote:row.rights_note??null,visualQaApproved:Boolean(row.visual_qa_approved)})}}
export async function deleteMedia(id:string){const s=await createSupabaseServerClient();const{data,error}=await s.from('media').select('*').eq('id',id).single();if(error||!data)throw new Error('MEDIA_NOT_FOUND');if(data.protected)throw new Error('PROTECTED_MEDIA');const usage=await getMediaUsage(id);if(usage.length)throw new Error('MEDIA_IN_USE');const{error:storageError}=await s.storage.from('oec-media').remove([data.storage_path]);if(storageError)throw new Error(`MEDIA_DELETE_FAILED:${storageError.message}`);const{error:rowError}=await s.from('media').delete().eq('id',id);if(rowError)throw new Error(`MEDIA_DELETE_FAILED:${rowError.message}`)}
