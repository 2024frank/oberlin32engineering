'use client'

import { useEffect,useRef,useState } from 'react'
import Link from 'next/link'
import { Menu,X } from 'lucide-react'
import type { CurrentAdmin } from '@/lib/auth/session'
import { AdminSidebar } from './AdminSidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'

export function AdminShell({admin,children}:{admin:CurrentAdmin;children:React.ReactNode}){const[open,setOpen]=useState(false);const menuRef=useRef<HTMLButtonElement>(null);const closeRef=useRef<HTMLButtonElement>(null);useEffect(()=>{function key(event:KeyboardEvent){if(event.key==='Escape'&&open){setOpen(false);menuRef.current?.focus()}}document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open]);useEffect(()=>{if(open)closeRef.current?.focus()},[open]);function close(){setOpen(false);menuRef.current?.focus()}return <div className="admin-shell"><button ref={menuRef} className="admin-menu" type="button" onClick={()=>setOpen(true)} aria-label="Open portal navigation" aria-controls="admin-mobile-navigation" aria-expanded={open}><Menu aria-hidden="true"/></button><div id="admin-mobile-navigation" className={open?'admin-drawer is-open':'admin-drawer'} aria-hidden={!open} inert={!open}><button ref={closeRef} type="button" onClick={close} aria-label="Close portal navigation"><X aria-hidden="true"/></button><AdminSidebar admin={admin} onNavigate={close}/></div><div className="admin-desktop-sidebar"><AdminSidebar admin={admin}/></div><div className="admin-workspace"><header className="admin-topbar"><div><small>Oberlin Engineering Club</small><strong>Officer Portal</strong></div><div className="portal-topbar-actions"><Link href={process.env.NEXT_PUBLIC_SITE_URL??'https://oberlin32engineeringsociety.com'} target="_blank" rel="noreferrer">View public site ↗</Link><SignOutButton portal="admin"/></div></header>{children}</div></div>}
