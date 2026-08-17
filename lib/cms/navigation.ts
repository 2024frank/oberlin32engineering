import { createSupabaseServerClient } from '@/lib/supabase/server'

export type NavigationItemInput={id?:string;label:string;destination:string;visible:boolean;external:boolean;sortOrder:number}
export type NavigationItem=Required<Pick<NavigationItemInput,'label'|'destination'|'visible'|'external'|'sortOrder'>>&{id:string}

export function validateNavigationDestination(value:string,external:boolean):string{
  const destination=value.trim()
  if(!destination||/^\s*(javascript|data|vbscript):/i.test(destination))throw new Error('UNSAFE_DESTINATION')
  if(external){
    let url:URL
    try{url=new URL(destination)}catch{throw new Error('UNSAFE_DESTINATION')}
    if(!['http:','https:'].includes(url.protocol))throw new Error('UNSAFE_DESTINATION')
    return url.toString()
  }
  if(!destination.startsWith('/')||destination.startsWith('//'))throw new Error('UNSAFE_DESTINATION')
  return destination
}

export function validateNavigationItems(input:unknown):NavigationItemInput[]{
  if(!Array.isArray(input)||input.length>20)throw new Error('INVALID_NAVIGATION')
  return input.map((raw,index)=>{
    if(!raw||typeof raw!=='object')throw new Error('INVALID_NAVIGATION')
    const item=raw as Record<string,unknown>
    const label=String(item.label??'').trim()
    if(!label||label.length>80)throw new Error('INVALID_NAVIGATION')
    const external=Boolean(item.external)
    const destination=validateNavigationDestination(String(item.destination??''),external)
    const id=typeof item.id==='string'&&item.id?item.id:undefined
    return{id,label,destination,external,visible:item.visible!==false,sortOrder:(index+1)*10}
  })
}

export async function listNavigationForAdmin():Promise<NavigationItem[]>{
  const s=await createSupabaseServerClient()
  const{data,error}=await s.from('navigation_items').select('id,label,destination,visible,external,sort_order').order('sort_order')
  if(error)throw new Error(`NAVIGATION_LOAD_FAILED:${error.message}`)
  return(data??[]).map(row=>({id:row.id,label:row.label,destination:row.destination,visible:row.visible,external:row.external,sortOrder:row.sort_order}))
}

export async function replaceNavigation(items:unknown,actorId:string){
  const validated=validateNavigationItems(items)
  const s=await createSupabaseServerClient()
  const{error}=await s.rpc('replace_navigation_items',{p_items:validated.map(item=>({id:item.id??null,label:item.label,destination:item.destination,visible:item.visible,external:item.external,sort_order:item.sortOrder}))})
  if(error)throw new Error(`NAVIGATION_SAVE_FAILED:${error.message}`)
  await s.from('audit_log').insert({actor_id:actorId,action:'NAVIGATION_REPLACED',entity_type:'navigation',entity_id:'main',after_snapshot:validated})
}
