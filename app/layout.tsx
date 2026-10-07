import type { Metadata, Viewport } from 'next'
import { Caveat, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { ClientRoot } from '@/components/ClientRoot'
/* Design system first (no @import inside Tailwind file — Turbopack expands @tailwind before @import) */
import './globals.syncly.css'
import './globals.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})
const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})
const hand = Caveat({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-hand', display: 'swap' })

const SITE = 'https://finality.accuracy.wtf'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Finality · Pay-per-request APIs on Cardano', template: '%s · Finality' },
  description:
    'Pro market, AI, and Cardano on-chain APIs for people and agents. Pay USDM per request via x402. No monthly plans, no API keys.',
  icons: { icon: '/favicon.svg', apple: `${SITE}/logo.webp` },
  openGraph: {
    siteName: 'Finality',
    title: 'Finality · Pay-per-request APIs on Cardano',
    description:
      'Skip monthly Pro subscriptions. Call market, intelligence, AI, and on-chain APIs one request at a time with Cardano x402.',
    type: 'website',
    url: SITE,
    images: [{ url: `${SITE}/og.png`, width: 1280, height: 720, alt: 'Finality' }],
  },
  keywords: ['Finality', 'Cardano', 'x402', 'USDM', 'CIP-30', 'pay per request', 'agents'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FBF9F4',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} ${hand.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
