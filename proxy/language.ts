import { NextRequest, NextResponse } from "next/server"

type AvailableLocale = "zh-hant" | "zh-hans" | "en"
const locales: AvailableLocale[] = ["zh-hant", "zh-hans", "en"] as const
const defaultLocale: AvailableLocale = "zh-hant" as const

function hasPathLocale(pathname: string): boolean {
  return locales.some(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
}

function getCookieLocale(request: NextRequest): AvailableLocale {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value as
    | AvailableLocale
    | undefined
  return cookie && locales.includes(cookie) ? cookie : defaultLocale
}

export function handleLanguageRedirect(
  request: NextRequest
): NextResponse | null {
  const { nextUrl } = request
  const { pathname, search } = nextUrl

  // If the path already has a locale, respect it and do nothing
  if (hasPathLocale(pathname)) return null

  // Compute target locale from cookie (fallback to default)
  const locale = getCookieLocale(request)

  // Build redirect URL preserving search params
  const url = new URL(nextUrl)
  url.pathname = `/${locale}${pathname}`
  url.search = search

  // Avoid accidental self-redirect loops
  if (url.pathname === pathname) return null

  return NextResponse.redirect(url)
}
