import { AnnouncementBanner } from '@/components/public/AnnouncementBanner'
import { PublicFooter } from '@/components/public/PublicFooter'
import { PublicHeader } from '@/components/public/PublicHeader'
import { getPublishedNavigation, getPublicSiteSettings } from '@/lib/page-builder/publicPages'
export default async function PublicLayout({children}:{children:React.ReactNode}){const[items,settings]=await Promise.all([getPublishedNavigation(),getPublicSiteSettings()]);return <div className="site-shell"><AnnouncementBanner announcement={settings.announcement}/><PublicHeader items={items} logoSrc={settings.brand.horizontalUrl}/><main id="main-content">{children}</main><PublicFooter contactEmail={settings.contact.email} footerText={settings.footer.text} socialLinks={settings.social} badgeSrc={settings.brand.badgeUrl}/></div>}
