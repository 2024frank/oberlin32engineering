import { MediaLibrary } from '@/components/admin/media/MediaLibrary'
import { listMedia } from '@/lib/cms/media'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
export default async function MediaPage(){const admin=await requireAdmin();if(!can(admin.role,'EDIT_CONTENT',admin.scopes,'media'))return <AccessDenied/>;return <MediaLibrary initialAssets={await listMedia()} />}
