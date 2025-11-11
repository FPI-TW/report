import { NextRequest, NextResponse } from "next/server"

type AvailableLocale = "zh-hant" | "zh-hans" | "en"
const locales: AvailableLocale[] = ["zh-hant", "zh-hans", "en"] as const
const defaultLocale: AvailableLocale = "zh-hant" as const

function hasPathLocale(pathname: string): boolean {
  return locales.some(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
}

function getCookieLocale(request: NextRequest): AvailableLocale | undefined {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value as string | undefined
  if (!cookie) return undefined
  const value = cookie in locales ? (cookie as AvailableLocale) : undefined
  return value
}

function parseAcceptLanguage(
  header: string | null
): AvailableLocale | undefined {
  if (!header) return undefined
  const parts: string[] = header.split(",")
  for (const p of parts) {
    const code = p.split(";")[0]?.trim().toLowerCase()
    if (!code) continue
    // Chinese Traditional
    if (
      code.startsWith("zh-hant") ||
      code === "zh-tw" ||
      code === "zh-hk" ||
      code === "zh-mo"
    )
      return "zh-hant"
    // Chinese Simplified
    if (code.startsWith("zh-hans") || code === "zh-cn" || code === "zh-sg")
      return "zh-hans"
    // Generic zh falls back to simplified by default
    if (code === "zh") return "zh-hans"
    // English
    if (code.startsWith("en")) return "en"
  }
  return undefined
}

export function handleLanguageRedirect(
  request: NextRequest
): NextResponse | null {
  const { nextUrl } = request
  const { pathname, search } = nextUrl

  // If the path already has a locale, respect it and do nothing
  if (hasPathLocale(pathname)) {
    // set cookie("NEXT_LOCALE") to the locale in the path
    const locale = pathname.split("/")[1] as AvailableLocale
    request.cookies.set("NEXT_LOCALE", locale)
    return null
  }

  // Compute target locale: cookie -> Accept-Language -> default
  const cookieLocale = getCookieLocale(request)
  const headerLocale = parseAcceptLanguage(
    request.headers.get("accept-language")
  )
  const locale = cookieLocale || headerLocale || defaultLocale

  // Build redirect URL preserving search params
  const url = new URL(nextUrl)
  url.pathname = `/${locale}${pathname}`
  url.search = search

  // Avoid accidental self-redirect loops
  if (url.pathname === pathname) return null

  const res = NextResponse.redirect(url)
  // If there was no cookie, set one for subsequent requests
  if (!cookieLocale) {
    res.cookies.set("NEXT_LOCALE", locale, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  }
  return res
}
