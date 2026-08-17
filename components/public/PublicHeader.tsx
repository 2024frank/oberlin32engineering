'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect,useRef,useState } from 'react'
import { Menu,X } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import type { PublicNavigationItem } from '@/lib/page-builder/publicPages'

export const publicNavigation=[['Home','/'],['About','/about'],['Projects','/projects'],['Events','/events'],['Opportunities','/opportunities'],['Resources','/resources'],['3-2 Pathway','/pathway'],['News','/news'],['Get Involved','/get-involved'],['Member Sign In','/member/login']] as const
export function PublicHeader({items,logoSrc}:{items?:PublicNavigationItem[];logoSrc?:string|null}){const nav:PublicNavigationItem[]=items??publicNavigation.map(([label,destination])=>({label,destination}));const pathname=usePathname();
// "/" would otherwise prefix-match every route, so Home is an exact match only.
const isCurrent=(destination:string)=>destination==='/'?pathname==='/':pathname===destination||pathname.startsWith(`${destination}/`);
const[open,setOpen]=useState(false);const menuRef=useRef<HTMLButtonElement>(null);const firstLinkRef=useRef<HTMLAnchorElement>(null);useEffect(()=>{function key(event:KeyboardEvent){if(event.key==='Escape'&&open){setOpen(false);menuRef.current?.focus()}}document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open]);useEffect(()=>{if(open)firstLinkRef.current?.focus()},[open]);return <header className="public-header"><a className="skip-link" href="#main-content">Skip to content</a><div className="shell public-header__inner"><Link href="/" className="public-header__brand" aria-label="Oberlin Engineering Club home"><BrandLogo src={logoSrc}/></Link><button ref={menuRef} className="public-menu" type="button" aria-label={open?'Close navigation':'Open navigation'} aria-controls="primary-navigation" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<X aria-hidden="true"/>:<Menu aria-hidden="true"/>}</button><nav id="primary-navigation" aria-label="Primary navigation" className={open?'is-open':''}><ul>{nav.map((item,index)=><li key={`${item.label}-${item.destination}`}><Link ref={index===0?firstLinkRef:undefined} href={item.destination} target={item.external?'_blank':undefined} rel={item.external?'noreferrer':undefined} aria-current={isCurrent(item.destination)?'page':undefined} className={item.label==='Get Involved'?'nav-cta':undefined} onClick={()=>setOpen(false)}>{item.label}</Link></li>)}</ul></nav></div></header>}
