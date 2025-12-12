import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { isSuperUserClaims } from "@/lib/admin"
import { isReportType, type ReportType } from "@/types/reports"

export const UPLOAD_URL_EXPIRES = 300

export async function requireSuperUser(): Promise<Response | null> {
  const sessionToken = (await cookies()).get(COOKIE_NAME)?.value
  const claims = sessionToken ? verifyJwt(sessionToken) : null

  if (!claims) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  if (!isSuperUserClaims(claims)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }

  return null
}

export function parseCategory(value: unknown): ReportType | null {
  if (!value || typeof value !== "string") return null
  return isReportType(value) ? value : null
}

export function parseFilename(value: unknown): string | null {
  if (!value || typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
