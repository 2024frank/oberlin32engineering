import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { SiteSettingsForm } from '@/components/admin/system/SiteSettingsForm'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listMedia } from '@/lib/cms/media'
import { getAdminSiteSettings } from '@/lib/cms/siteSettings'
import { can } from '@/lib/permissions/can'
export default async function SettingsPage(){const admin=await requireAdmin();if(!can(admin.role,'MANAGE_SITE_SETTINGS'))return <AccessDenied/>;const[initial,mediaAssets]=await Promise.all([getAdminSiteSettings(),listMedia()]);return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">System</p><h1>Site Settings</h1><p>Manage global contact, social, SEO, announcement, and official brand references.</p></div></div><SiteSettingsForm initial={initial} mediaAssets={mediaAssets}/></main>}
