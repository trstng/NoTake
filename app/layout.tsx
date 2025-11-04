import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://notake.io'),
  title: {
    default: 'NoTake - Prediction Market Analytics',
    template: '%s | NoTake',
  },
  description: 'Track and analyze your prediction market trades with real-time analytics. Compatible with Kalshi, Polymarket, and more. Monitor P&L, equity curves, and deep analytics for serious traders.',
  keywords: [
    'prediction markets',
    'prediction market analytics',
    'Kalshi',
    'Polymarket',
    'trading analytics',
    'P&L tracking',
    'equity curves',
    'market analysis',
    'trading dashboard',
    'real-time analytics',
  ],
  authors: [{ name: 'NoTake Team' }],
  creator: 'NoTake',
  applicationName: 'NoTake',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://notake.io',
    siteName: 'NoTake',
    title: 'NoTake - Prediction Market Analytics',
    description: 'Track and analyze your prediction market trades with real-time analytics. Compatible with Kalshi, Polymarket, and more.',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'NoTake - Prediction Market Analytics Dashboard',
    }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'NoTake - Prediction Market Analytics',
    description: 'Track and analyze your prediction market trades with real-time analytics',
    images: ['/twitter-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
