import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { handleLanguageRedirect } from "./proxy/language"

const intlMiddleware = createMiddleware({
  locales: ["zh-hant", "zh-hans", "en"],
  defaultLocale: "zh-hant",
  localePrefix: "always",
  localeDetection: true,
})

export function proxy(request: NextRequest) {
  const languageRedirect = handleLanguageRedirect(request)
  if (languageRedirect) return languageRedirect

  // Auth guard for dashboard pages
  const { pathname } = request.nextUrl
  const segments = pathname.split("/").filter(Boolean)
  const isDashboard = segments.length >= 3 && segments[2] === "dashboard"
  if (isDashboard) {
    const session = request.cookies.get("session")?.value
    if (!session) {
      const locale = segments[0]
      const customerID = segments[1]
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
