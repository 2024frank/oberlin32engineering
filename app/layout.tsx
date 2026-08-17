import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Oberlin Engineering Club', template: '%s · Oberlin Engineering Club' },
  description: 'Oberlin students connecting across engineering disciplines to build, learn, and create together.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
