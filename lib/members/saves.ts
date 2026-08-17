export type SavedItemType = 'PROJECT' | 'OPPORTUNITY' | 'RESOURCE'
export type SavedItem = { itemType: SavedItemType; itemId: string; createdAt: string; title: string; subtitle?: string; href: string }

const tableByType: Record<SavedItemType, 'projects'|'opportunities'|'resources'> = { PROJECT:'projects', OPPORTUNITY:'opportunities', RESOURCE:'resources' }
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeSavedItemType(value: string): SavedItemType { if(value!=='PROJECT'&&value!=='OPPORTUNITY'&&value!=='RESOURCE')throw new Error('SAVED_ITEM_TYPE_INVALID');return value }
export function savedItemKey(userId:string,itemType:SavedItemType,itemId:string){return `${userId}:${itemType}:${itemId}`}
function assertItemId(value:string){if(!uuidPattern.test(value))throw new Error('SAVED_ITEM_ID_INVALID');return value}

async function client(){const {createSupabaseServerClient}=await import('@/lib/supabase/server');return createSupabaseServerClient()}

async function assertPublishedEntity(itemType:SavedItemType,itemId:string){const s=await client();const table=tableByType[itemType];const{data,error}=await s.from(table).select('id').eq('id',itemId).eq('publication_state','published').maybeSingle();if(error||!data)throw new Error('SAVED_ITEM_NOT_FOUND')}

export async function setSavedItem(userId:string,itemTypeInput:string,itemIdInput:string,saved:boolean){const itemType=normalizeSavedItemType(itemTypeInput);const itemId=assertItemId(itemIdInput);const s=await client();if(saved){await assertPublishedEntity(itemType,itemId);const{error}=await s.from('saved_items').upsert({user_id:userId,item_type:itemType,item_id:itemId},{onConflict:'user_id,item_type,item_id'});if(error)throw new Error(`SAVE_ITEM_FAILED:${error.message}`)}else{const{error}=await s.from('saved_items').delete().eq('user_id',userId).eq('item_type',itemType).eq('item_id',itemId);if(error)throw new Error(`UNSAVE_ITEM_FAILED:${error.message}`)}return{saved}}

export async function getSavedItemIds(userId:string,itemType:SavedItemType,itemIds?:string[]){const s=await client();let q=s.from('saved_items').select('item_id').eq('user_id',userId).eq('item_type',itemType);if(itemIds?.length)q=q.in('item_id',itemIds);const{data,error}=await q;if(error)throw new Error(`SAVED_ITEMS_LOAD_FAILED:${error.message}`);return new Set((data??[]).map(row=>String(row.item_id)))}

export async function isSavedItem(userId:string,itemType:SavedItemType,itemId:string){return (await getSavedItemIds(userId,itemType,[itemId])).has(itemId)}

export async function listSavedItems(userId:string):Promise<SavedItem[]>{const s=await client();const{data:rows,error}=await s.from('saved_items').select('item_type,item_id,created_at').eq('user_id',userId).order('created_at',{ascending:false});if(error)throw new Error(`SAVED_ITEMS_LOAD_FAILED:${error.message}`);const list=rows??[];const byType=(type:SavedItemType)=>list.filter(row=>row.item_type===type);const output:SavedItem[]=[]
  for(const type of ['PROJECT','OPPORTUNITY','RESOURCE'] as const){const entries=byType(type);if(!entries.length)continue;const ids=entries.map(row=>row.item_id);const table=tableByType[type];const fields=type==='PROJECT'?'id,title,slug,summary':type==='OPPORTUNITY'?'id,title,organization':'id,title,category';const{data}=await s.from(table).select(fields).in('id',ids).eq('publication_state','published');const map=new Map((data??[]).map((row:any)=>[row.id,row]));for(const entry of entries){const entity:any=map.get(entry.item_id);if(!entity)continue;output.push({itemType:type,itemId:entry.item_id,createdAt:entry.created_at,title:entity.title,subtitle:type==='PROJECT'?entity.summary:type==='OPPORTUNITY'?entity.organization:entity.category,href:type==='PROJECT'?`/projects/${entity.slug}`:type==='OPPORTUNITY'?'/opportunities':'/resources'})}}
  return output.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
}
