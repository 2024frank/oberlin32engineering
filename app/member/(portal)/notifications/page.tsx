import { requireActiveMember } from '@/lib/auth/memberSession'
import { listMemberNotifications } from '@/lib/notifications/service'
import { NotificationList } from '@/components/member/NotificationList'
export default async function NotificationsPage(){await requireActiveMember();const notifications=await listMemberNotifications();return <main className="admin-panel"><div className="admin-page-heading"><div><p className="eyebrow">Stay in sync</p><h1>Notifications</h1><p>Project invitations, application decisions, proposal reviews, and team-update reviews appear here.</p></div></div><NotificationList initial={notifications}/></main>}
