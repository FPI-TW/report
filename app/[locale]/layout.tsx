// Next features
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import {
  getLocale,
  getMessages,
  getTimeZone,
  setRequestLocale,
} from "next-intl/server"
import { Analytics } from "@vercel/analytics/next"
import { GoogleAnalytics } from "@next/third-parties/google"

// Style
import "../globals.css"

// Provider or Component
import Provider from "./provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "廷豐報告機器人生成式AI系統",
  description: "Gerand Empire report AI",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [messages, locale, timeZone] = await Promise.all([
    getMessages(),
    getLocale(),
    getTimeZone(),
  ])
  setRequestLocale(locale)

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Provider locale={locale} messages={messages} timeZone={timeZone}>
          {children}
        </Provider>
        {process.env.NODE_ENV !== "development" && (
          <>
            <Analytics />
            <GoogleAnalytics gaId="G-44DL50PYWW" />
          </>
        )}
      </body>
    </html>
  )
}
