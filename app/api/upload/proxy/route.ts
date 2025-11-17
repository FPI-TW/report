import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { isSuperUserClaims } from "@/lib/admin"

export async function POST(req: NextRequest) {
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

  try {
    const formData = await req.formData()
    const uploadUrl = formData.get("uploadUrl")
    const contentType = formData.get("contentType")
    const file = formData.get("file")

    if (
      typeof uploadUrl !== "string" ||
      typeof contentType !== "string" ||
      !(file instanceof Blob)
    ) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const uploadResp = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: file,
    })

    if (!uploadResp.ok) {
      const text = await uploadResp.text().catch(() => "")
      return new Response(
        JSON.stringify({
          error: "upload_failed",
          status: uploadResp.status,
          body: text || undefined,
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "upload_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    )
  }
}
