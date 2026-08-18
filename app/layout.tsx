import type { Metadata, Viewport } from "next"
import { Inter, LINE_Seed_JP } from "next/font/google"

import "./globals.css"

const latinFont = Inter({
  variable: "--font-latin",
  weight: "variable",
  subsets: ["latin"],
  display: "swap",
})

const japaneseFont = LINE_Seed_JP({
  variable: "--font-japanese",
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  adjustFontFallback: false,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ja"
      className={`${latinFont.variable} ${japaneseFont.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
