import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Oberlin Engineering Club', template: '%s · Oberlin Engineering Club' },
  description: 'A student group at Oberlin College for students who build things, and for anyone considering the 3-2 engineering pathway with Caltech, Case Western Reserve, Columbia, or WashU.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
