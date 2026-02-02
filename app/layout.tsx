import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Phantom Chat - Mensagens Seguras',
  description: 'Envie mensagens que desaparecem. Privacidade total, sem rastros.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon.png' },
      { url: '/icon.png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0d0d14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased overflow-hidden bg-background min-h-dvh">
        <div className="w-full min-h-dvh flex items-center justify-center bg-muted/30">
          {children}
        </div>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
