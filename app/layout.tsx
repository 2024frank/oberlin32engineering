import type { Metadata } from 'next'
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['opsz'] })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-body' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: { default: 'Oberlin Engineering Club', template: '%s · Oberlin Engineering Club' },
  description: 'A student group at Oberlin College for students who build things, and for anyone considering the 3-2 engineering pathway with Caltech, Case Western Reserve, Columbia, or WashU.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${fraunces.variable} ${instrumentSans.variable} ${plexMono.variable}`}><body>{children}</body></html>
}
