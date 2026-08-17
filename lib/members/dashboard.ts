import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export type MemberDashboardSummary={saved:number;openApplications:number;pendingInvitations:number;activeTeams:number;projectProposals:number;unreadNotifications:number}
export async function getMemberDashboardSummary(userId:string):Promise<MemberDashboardSummary>{const s=await createSupabaseServerClient();const[saved,apps,invites,teams,proposals,notifications]=await Promise.all([
  s.from('saved_items').select('*',{count:'exact',head:true}).eq('user_id',userId),
  s.from('project_applications').select('*',{count:'exact',head:true}).eq('applicant_user_id',userId).eq('status','PENDING'),
  s.from('project_team_invites').select('*',{count:'exact',head:true}).eq('invited_user_id',userId).eq('status','PENDING'),
  s.from('project_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','ACTIVE'),
  s.from('project_proposals').select('*',{count:'exact',head:true}).eq('proposer_user_id',userId).in('status',['PENDING','APPROVED']),
  s.from('member_notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null),
]);return{saved:saved.count??0,openApplications:apps.count??0,pendingInvitations:invites.count??0,activeTeams:teams.count??0,projectProposals:proposals.count??0,unreadNotifications:notifications.count??0}}
