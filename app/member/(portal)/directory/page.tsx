import { requireActiveMember } from '@/lib/auth/memberSession'
import { filterDirectoryMembers, searchMemberDirectory } from '@/lib/members/directory'
import { DirectoryFilters } from '@/components/member/DirectoryFilters'
import { MemberCard } from '@/components/member/MemberCard'

const one=(value:string|string[]|undefined)=>typeof value==='string'?value:''
const uniq=(values:(string|undefined)[])=>Array.from(new Set(values.filter((value):value is string=>Boolean(value)))).sort((a,b)=>a.localeCompare(b))
const uniqList=(values:(string[]|undefined)[])=>uniq(values.flatMap(value=>value??[]))

export default async function MemberDirectoryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  await requireActiveMember();const params=await searchParams;const query=one(params.q);const safeMembers=await searchMemberDirectory(query);const filters={discipline:one(params.discipline),skill:one(params.skill),major:one(params.major),classYear:one(params.year),interest:one(params.interest),availability:one(params.availability)};const members=filterDirectoryMembers(safeMembers,filters)
  const options={disciplines:uniqList(safeMembers.map(m=>m.disciplines)),skills:uniqList(safeMembers.map(m=>m.skills)),majors:uniq(safeMembers.map(m=>m.major)),classYears:Array.from(new Set(safeMembers.map(m=>m.classYear).filter((v):v is number=>typeof v==='number'))).sort((a,b)=>a-b),interests:uniqList(safeMembers.map(m=>m.projectInterests))}
  return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Private OEC community</p><h1>Member directory</h1><p>Find collaborators by engineering discipline, skills, interests, and availability. Every card respects that member’s privacy settings.</p></div></div><DirectoryFilters initial={{q:query,...filters,year:filters.classYear}} options={options}/><p className="directory-result-count">{members.length} member{members.length===1?'':'s'} shown</p>{members.length?<div className="member-directory-grid">{members.map(member=><MemberCard key={member.userId} member={member}/>)}</div>:<div className="empty-state"><h2>No members match those filters.</h2><p>Try clearing one or more filters.</p></div>}</main>
}
