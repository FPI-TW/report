import { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { handleLanguageRedirect } from "./proxy/language"

const locales = ["zh-hant", "zh-hans", "en"] as const
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "zh-hant",
  localePrefix: "always",
  localeDetection: true,
})

export function proxy(request: NextRequest) {
  const languageRedirect = handleLanguageRedirect(request)
  if (languageRedirect) return languageRedirect

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
