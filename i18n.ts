import { getRequestConfig } from "next-intl/server"
export const locales = ["en", "zh-hant", "zh-hans"] as const
export type AppLocale = (typeof locales)[number]
export const defaultLocale: AppLocale = "en"

export default getRequestConfig(async ({ locale }) => {
  const finalLocale = locale ?? defaultLocale
  return {
    locale: finalLocale,
    messages: (await import(`./messages/${finalLocale}.json`)).default,
  }
})
