import { NextRequest, NextResponse } from "next/server"
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

  const { pathname } = request.nextUrl
  const segments = pathname.split("/").filter(Boolean)
  const locale = segments[0]
  const customerID = segments[1]
  const isCustomerArea =
    locales.includes(locale as (typeof locales)[number]) && !!customerID
  const isLoginPage = isCustomerArea && segments.length === 2

  if (isCustomerArea && !isLoginPage) {
    const session = request.cookies.get("session")?.value
    if (!session) {
      return NextResponse.redirect(
        new URL(`/${locale}/${customerID}`, request.url)
      )
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
