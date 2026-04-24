'use client'

import { Fraunces, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

/* Fraunces — display/data/emotional moments */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],    /* Variable axes for weight animation */
})

/* General Sans — loaded as local font from Fontshare CDN cached locally */
/* Download from https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap */
/* Place in public/fonts/ and reference via localFont */
const generalSans = localFont({
  src: [
    { path: '../public/fonts/GeneralSans-Regular.woff2',  weight: '400', style: 'normal' },
    { path: '../public/fonts/GeneralSans-Medium.woff2',   weight: '500', style: 'normal' },
    { path: '../public/fonts/GeneralSans-Semibold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-general-sans',
  display: 'swap',
})

/* Geist Mono — technical strings ONLY */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'UnwindAI — The Operating System for Life\'s Hardest Transitions',
  description:
    'AI agents coordinate your entire professional team. ' +
    'You only make decisions, never chase people.',
  keywords: ['divorce', 'legal', 'AI', 'case management', 'India'],
  robots: { index: false, follow: false },  // private product — no indexing
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,          // prevent zoom on mobile inputs
    userScalable: false,
  },
  themeColor: '#F2F1EE',      // matches --bg-base for mobile browser chrome
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UnwindAI',
  },
}

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${generalSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  )
}

// ── Rules for all child layouts ───────────────────────────────────────────────
// 1. Never add a language selector — English only
// 2. Never add Google Analytics or any tracking script
// 3. Never add a chat widget or intercom — we ARE the support
// 4. Providers (Supabase, wagmi) added in specific route layouts only
//    not here — keeps root layout minimal and fast