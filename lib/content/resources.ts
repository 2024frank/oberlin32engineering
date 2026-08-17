import 'server-only';import { createSupabaseServerClient } from '@/lib/supabase/server'
export type ResourceFilters={category?:string}
export function parseResourceFilters(p:URLSearchParams):ResourceFilters{return{category:p.get('category')||undefined}}
export async function listPublishedResources(filters:ResourceFilters={}){if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return[];const s=await createSupabaseServerClient();let q=s.from('resources').select('*').eq('publication_state','published').order('pinned',{ascending:false}).order('sort_order');if(filters.category)q=q.ilike('category',filters.category);const{data,error}=await q;if(error)throw new Error(`RESOURCES_LOAD_FAILED:${error.message}`);return data??[]}
export async function listPublishedPartnerSchools(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return[];const s=await createSupabaseServerClient();const{data}=await s.from('partner_schools').select('*').eq('publication_state','published').order('sort_order');return data??[]}
