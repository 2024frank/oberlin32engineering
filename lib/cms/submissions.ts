import 'server-only';import { createSupabaseServerClient } from '@/lib/supabase/server'
export async function listSubmissions(){const s=await createSupabaseServerClient();const{data,error}=await s.from('submissions').select('id,type,full_name,email,payload,status,created_at').order('created_at',{ascending:false}).limit(200);if(error)throw new Error(error.message);return data??[]}
