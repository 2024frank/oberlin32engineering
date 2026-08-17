import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { mapNotificationRow, type MemberNotification } from './model'
export { mapNotificationRow } from './model'
export type { MemberNotification } from './model'

export async function createMemberNotification(input:{userId:string;kind:string;title:string;body:string;actionUrl?:string|null}){const s=createSupabaseAdminClient();const{data,error}=await s.from('member_notifications').insert({user_id:input.userId,kind:input.kind,title:input.title,body:input.body,action_url:input.actionUrl??null}).select('id,kind,title,body,action_url,read_at,created_at').single();if(error||!data)throw new Error(`MEMBER_NOTIFICATION_CREATE_FAILED:${error?.message??'unknown'}`);return mapNotificationRow(data)}
export async function listMemberNotifications(limit=100):Promise<MemberNotification[]>{const s=await createSupabaseServerClient();const{data,error}=await s.from('member_notifications').select('id,kind,title,body,action_url,read_at,created_at').order('created_at',{ascending:false}).limit(Math.min(Math.max(limit,1),200));if(error)throw new Error(`MEMBER_NOTIFICATIONS_LOAD_FAILED:${error.message}`);return(data??[]).map(mapNotificationRow)}
export async function markNotificationRead(notificationId:string){const s=await createSupabaseServerClient();const{data,error}=await s.from('member_notifications').update({read_at:new Date().toISOString()}).eq('id',notificationId).is('read_at',null).select('id,kind,title,body,action_url,read_at,created_at').maybeSingle();if(error)throw new Error(`MEMBER_NOTIFICATION_READ_FAILED:${error.message}`);return data?mapNotificationRow(data):null}
export async function markAllNotificationsRead(){const s=await createSupabaseServerClient();const{error}=await s.from('member_notifications').update({read_at:new Date().toISOString()}).is('read_at',null);if(error)throw new Error(`MEMBER_NOTIFICATIONS_READ_FAILED:${error.message}`)}
