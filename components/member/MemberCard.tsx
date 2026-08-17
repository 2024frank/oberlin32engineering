import type { DirectoryMember } from '@/lib/members/directory'
export function MemberCard({ member }: { member: DirectoryMember }) {
  return <article className="member-card"><div className="member-card__initial" aria-hidden="true">{(member.displayName??'O').slice(0,1).toUpperCase()}</div><div><h2>{member.displayName??'OEC member'}</h2>{(member.major||member.classYear)&&<p>{[member.major,member.classYear&&`Class of ${member.classYear}`].filter(Boolean).join(' · ')}</p>}</div>
    {member.disciplines?.length?<TagList label="Disciplines" items={member.disciplines}/>:null}{member.skills?.length?<TagList label="Skills" items={member.skills}/>:null}{member.projectInterests?.length?<TagList label="Project interests" items={member.projectInterests}/>:null}
    {member.availability&&<p className="member-card__availability"><strong>Availability:</strong> {member.availability}</p>}
    {(member.portfolioUrl||member.githubUrl||member.linkedinUrl||member.contactEmail)&&<div className="member-card__links">{member.portfolioUrl&&<a href={member.portfolioUrl} target="_blank" rel="noreferrer">Portfolio</a>}{member.githubUrl&&<a href={member.githubUrl} target="_blank" rel="noreferrer">GitHub</a>}{member.linkedinUrl&&<a href={member.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>}{member.contactEmail&&<a href={`mailto:${member.contactEmail}`}>Email</a>}</div>}
  </article>
}
function TagList({label,items}:{label:string;items:string[]}){return <div className="member-card__tags"><span>{label}</span><div>{items.map(item=><small key={item}>{item}</small>)}</div></div>}
