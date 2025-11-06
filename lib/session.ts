import crypto from "node:crypto"

function b64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function b64urlJson(obj: unknown) {
  return b64url(Buffer.from(JSON.stringify(obj)))
}

function getSecret(): Buffer {
  const sec = process.env.AUTH_SECRET
  if (!sec) throw new Error("Missing env AUTH_SECRET")
  return Buffer.from(sec)
}

export type SessionClaims = {
  sub: string
  customerID: string
  account: string
  iat: number
  exp: number
}

export function signJwt(claims: SessionClaims) {
  const header = { alg: "HS256", typ: "JWT" }
  const encHeader = b64urlJson(header)
  const encPayload = b64urlJson(claims)
  const data = `${encHeader}.${encPayload}`
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest()
  return `${data}.${b64url(sig)}`
}

export function verifyJwt(token: string): SessionClaims | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [h, p, s] = parts as [string, string, string]
  const data = `${h}.${p}`
  const expected = b64url(
    crypto.createHmac("sha256", getSecret()).update(data).digest()
  )
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)))
    return null
  try {
    const payload = JSON.parse(
      Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8"
      )
    ) as SessionClaims
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp)
      return null
    return payload
  } catch {
    return null
  }
}

export const COOKIE_NAME = "session"
export const MAX_AGE_SECONDS = 60 * 60 * 12 // 12 hours
