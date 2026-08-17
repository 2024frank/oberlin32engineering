'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { memberNavigation } from '@/lib/navigation/community'

export function MemberSidebar({displayName,onNavigate}:{displayName?:string;onNavigate?:()=>void}){const pathname=usePathname();return <aside className="member-sidebar" aria-label="Member portal navigation"><Link href="/member" className="member-sidebar__brand" onClick={onNavigate}><BrandLogo variant="badge"/><span><strong>OEC</strong><small>Member Portal</small></span></Link><nav>{memberNavigation.map(item=>{const active=item.href==='/member'?pathname==='/member':pathname.startsWith(item.href);return <Link key={item.href} href={item.href} aria-current={active?'page':undefined} onClick={onNavigate}>{item.label}</Link>})}</nav><div className="member-sidebar__footer">{displayName&&<strong>{displayName}</strong>}<Link href="/">Public OEC site ↗</Link></div></aside>}
