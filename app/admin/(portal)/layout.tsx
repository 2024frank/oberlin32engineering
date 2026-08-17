import { AdminShell } from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/auth/requireRole'
import { ToastProvider } from '@/components/ui/Toast'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  return <ToastProvider><AdminShell admin={admin}>{children}</AdminShell></ToastProvider>
}
