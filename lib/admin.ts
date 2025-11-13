import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt, type SessionClaims } from "@/lib/session"

function getSuperUsers(): Set<string> {
  // Comma or semicolon separated list of identifiers in the form customerID:account
  // Example: DASHBOARD_SUPER_USERS="internal:admin,corp:ops"
  const raw = process.env.DASHBOARD_SUPER_USERS || ""
  const items = raw
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean)
  return new Set(items)
}

export function isSuperUserClaims(claims: SessionClaims | null): boolean {
  if (!claims) return false
  const id = `${claims.customerID}:${claims.account}`
  return getSuperUsers().has(id)
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  return token ? verifyJwt(token) : null
}

export async function requireSuperUser(): Promise<SessionClaims | null> {
  const claims = await getSessionClaims()
  return isSuperUserClaims(claims) ? claims : null
}
