import { BrandLogo } from '@/components/brand/BrandLogo'
import { StaffActivationForm } from '@/components/admin/system/StaffActivationForm'

export default async function StaffActivatePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams
  const token = typeof params.invite === 'string' ? params.invite : ''
  return <main className="admin-login">
    <section className="admin-login__intro">
      <BrandLogo variant="badge" />
      <p className="eyebrow">Officer Invitation</p>
      <h1>Set up your OEC staff account.</h1>
      <p>Your email identity must match the invitation before administrative access is activated.</p>
    </section>
    <section className="admin-login__card">
      <BrandLogo variant="badge" />
      <h2>Activate account</h2>
      {token ? <StaffActivationForm token={token} /> : <p role="alert">This invitation link is incomplete. Ask the Super Admin for a new invitation.</p>}
    </section>
  </main>
}
