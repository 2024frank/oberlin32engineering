import { BrandLogo } from '@/components/brand/BrandLogo'
import { MemberLoginPanel } from '@/components/member/MemberLoginPanel'

export default function MemberLoginPage() {
  return <main className="member-login-page">
    <header className="member-login-heading"><BrandLogo variant="badge" /><p className="eyebrow">OEC Member Portal</p><h1>Build with the engineering community.</h1><p>Approved Oberlin members can save opportunities and resources, join projects, propose new work, and form teams.</p></header>
    <MemberLoginPanel />
  </main>
}
