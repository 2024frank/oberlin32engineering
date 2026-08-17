import { render,screen } from '@testing-library/react'
import { describe,expect,it,vi } from 'vitest'
import { MemberSidebar } from '@/components/member/MemberSidebar'
vi.mock('next/navigation',()=>({usePathname:()=>'/member'}))
describe('community navigation',()=>{it('shows the complete member portal navigation',()=>{render(<MemberSidebar displayName="Ada"/>);for(const label of ['Dashboard','My Profile','Member Directory','Saved','My Applications','My Teams','Project Invitations','Project Proposals','Notifications'])expect(screen.getByRole('link',{name:label})).toBeInTheDocument()})})
