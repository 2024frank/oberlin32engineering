import { AnnouncementBanner } from '@/components/public/AnnouncementBanner'
import { PublicFooter } from '@/components/public/PublicFooter'
import { OrganizationSchema } from '@/components/public/OrganizationSchema'
import { PublicHeader } from '@/components/public/PublicHeader'
import { getPublishedNavigation, getPublicSiteSettings } from '@/lib/page-builder/publicPages'
export default async function PublicLayout({children}:{children:React.ReactNode}){const[items,settings]=await Promise.all([getPublishedNavigation(),getPublicSiteSettings()]);return <div className="site-shell"><OrganizationSchema siteUrl={process.env.NEXT_PUBLIC_SITE_URL??'https://oberlin32engineeringsociety.com'} contactEmail={settings.contact.email} socialLinks={settings.social}/><AnnouncementBanner announcement={settings.announcement}/><PublicHeader items={items} logoSrc={settings.brand.horizontalUrl}/><main id="main-content">{children}</main><PublicFooter contactEmail={settings.contact.email} footerText={settings.footer.text} socialLinks={settings.social} badgeSrc={settings.brand.badgeUrl}/></div>}
