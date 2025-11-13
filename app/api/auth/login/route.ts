import { NextRequest, NextResponse } from "next/server"
import { findUserAccount, verifyPassword } from "@/lib/users"
import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  SessionClaims,
  signJwt,
} from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body)
      return NextResponse.json({ error: "invalid_body" }, { status: 400 })
    const { customerID, account, password } = body as {
      customerID?: string
      account?: string
      password?: string
    }
    if (!customerID || !account || !password)
      return NextResponse.json({ error: "invalid_body" }, { status: 400 })

    const rec = findUserAccount(customerID, account)
    if (!rec || !verifyPassword(password, rec.salt, rec.hash)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json(
        { error: "server_misconfigured", detail: "Missing AUTH_SECRET" },
        { status: 500 }
      )
    }

    const now = Math.floor(Date.now() / 1000)
    const claims: SessionClaims = {
      sub: `${customerID}:${account}`,
      customerID,
      account,
      iat: now,
      exp: now + MAX_AGE_SECONDS,
    }
    const token = signJwt(claims)

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    })
    return res
  } catch (err) {
    return NextResponse.json(
      { error: "unexpected", detail: err instanceof Error ? err.message : "" },
      { status: 500 }
    )
  }
}
