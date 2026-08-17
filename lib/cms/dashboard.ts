import 'server-only'
import type { AdminRole } from '@/lib/permissions/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export type DashboardSummary={newSubmissions:number;drafts:number;upcomingEvents:number;activeProjects:number;closingOpportunities:number;scheduledPublications:number;pendingMemberApprovals:number;activeStaffInvites:number;pendingProjectProposals:number;pendingProjectUpdateReviews:number}
export async function getDashboardSummary(role:AdminRole):Promise<DashboardSummary>{const s=await createSupabaseServerClient();const now=new Date();const soon=new Date(now.getTime()+14*86400000).toISOString().slice(0,10);const community=role!=='EDITOR';const[subs,drafts,pageDrafts,events,projects,opps,scheduled,members,staffInvites,proposals,updateReviews]=await Promise.all([
  s.from('submissions').select('*',{count:'exact',head:true}).eq('status','new'),
  s.from('content_drafts').select('*',{count:'exact',head:true}),
  s.from('page_sections').select('page_id',{count:'exact',head:true}),
  s.from('events').select('*',{count:'exact',head:true}).eq('publication_state','published').gte('start_at',now.toISOString()),
  s.from('projects').select('*',{count:'exact',head:true}).eq('publication_state','published').eq('status','active'),
  s.from('opportunities').select('*',{count:'exact',head:true}).eq('publication_state','published').gte('deadline',now.toISOString().slice(0,10)).lte('deadline',soon),
  s.from('scheduled_publications').select('*',{count:'exact',head:true}).is('processed_at',null),
  community?s.from('membership_requests').select('*',{count:'exact',head:true}).eq('status','PENDING_APPROVAL'):Promise.resolve({count:0}),
  role==='SUPER_ADMIN'?s.from('staff_invites').select('*',{count:'exact',head:true}).eq('status','INVITED'):Promise.resolve({count:0}),
  community?s.from('project_proposals').select('*',{count:'exact',head:true}).eq('status','PENDING'):Promise.resolve({count:0}),
  community?s.from('project_update_reviews').select('*',{count:'exact',head:true}).in('status',['PENDING_REVIEW','CHANGES_REQUESTED']):Promise.resolve({count:0}),
]);return{newSubmissions:subs.count??0,drafts:(drafts.count??0)+(pageDrafts.count??0),upcomingEvents:events.count??0,activeProjects:projects.count??0,closingOpportunities:opps.count??0,scheduledPublications:scheduled.count??0,pendingMemberApprovals:members.count??0,activeStaffInvites:staffInvites.count??0,pendingProjectProposals:proposals.count??0,pendingProjectUpdateReviews:updateReviews.count??0}}
export async function getRecentActivity(limit=12){const s=await createSupabaseServerClient();const{data}=await s.from('audit_log').select('id,action,entity_type,entity_id,created_at,actor_id').order('created_at',{ascending:false}).limit(limit);return data??[]}
