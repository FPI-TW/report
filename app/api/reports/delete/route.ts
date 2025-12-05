import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { isSuperUserClaims } from "@/lib/admin"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getR2Config, isAllowedReportKey, makeR2Client } from "@/lib/r2"

export async function DELETE(req: NextRequest) {
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

  const body = await req.json().catch(() => null)
  const key = (body?.key as string | undefined)?.trim()

  if (!key || !isAllowedReportKey(key)) {
    return new Response(JSON.stringify({ error: "invalid_key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  try {
    const { bucket } = getR2Config()
    const client = makeR2Client()
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await client.send(command)

    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (err) {
    console.error("Failed to delete report:", err)
    return new Response(
      JSON.stringify({
        error: "delete_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    )
  }
}
