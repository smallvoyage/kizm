import type { Metadata, Viewport } from "next"
import { Geist_Mono, Noto_Sans_JP } from "next/font/google"

import "./globals.css"

const appSans = Noto_Sans_JP({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  applicationName: "フィットネス分析",
  title: "フィットネス分析",
  description: "身体組成と栄養を確認する個人用フィットネスダッシュボードです。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "フィットネス分析",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "oklch(0.972 0.008 250)",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${appSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
