import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "../globals.css"
import Provider from "./provider"
import {
  getLocale,
  getMessages,
  getTimeZone,
  setRequestLocale,
} from "next-intl/server"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "廷豐",
  description: "Gerand Empire AI",
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
      </body>
    </html>
  )
}
