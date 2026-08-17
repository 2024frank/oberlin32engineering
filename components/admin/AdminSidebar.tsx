'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import type { CurrentAdmin } from '@/lib/auth/session'
import { adminCommunityNavigation } from '@/lib/navigation/community'

type Item=readonly [string,string]
type Group=readonly [string,readonly Item[]]
const publishing:Group=['Publishing',[['Website Pages','/admin/pages'],['Projects','/admin/projects'],['Project Updates','/admin/project-updates'],['Events','/admin/events'],['Opportunities','/admin/opportunities'],['News','/admin/news']]]
const directories:Group=['Directories',[['Leadership','/admin/leadership'],['Resources','/admin/resources'],['Documents','/admin/documents'],['Sponsors','/admin/sponsors'],['Media','/admin/media']]]
function groupsFor(admin:CurrentAdmin):Group[]{const workspace:Item[]=[['Overview','/admin'],['Submissions','/admin/submissions']];if(admin.role!=='EDITOR')for(const item of adminCommunityNavigation.filter(item=>item.href!=='/admin/users'))workspace.push([item.label,item.href]);const system:Item[]=[['Navigation','/admin/navigation'],['Site Settings','/admin/settings'],['Redirects','/admin/redirects'],['Audit History','/admin/audit']];if(admin.role==='SUPER_ADMIN'){const staff=adminCommunityNavigation.find(item=>item.href==='/admin/users')!;system.splice(3,0,[staff.label,staff.href])}return[['Workspace',workspace],publishing,directories,['System',system]]}
export function AdminSidebar({admin,onNavigate}:{admin:CurrentAdmin;onNavigate?:()=>void}){const pathname=usePathname();return <aside className="admin-sidebar" aria-label="Officer portal navigation"><Link href="/admin" className="admin-sidebar__brand" onClick={onNavigate}><BrandLogo variant="badge"/><span><strong>OEC</strong><small>Officer Portal</small></span></Link><nav>{groupsFor(admin).map(([title,items])=><section key={title}><p>{title}</p>{items.map(([label,href])=><Link key={href} href={href} onClick={onNavigate} aria-current={pathname===href?'page':undefined}>{label}</Link>)}</section>)}</nav><div className="admin-sidebar__user"><strong>{admin.displayName}</strong><small>{admin.role.replace('_',' ')}</small></div></aside>}
