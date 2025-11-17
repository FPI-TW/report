import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { isSuperUserClaims } from "@/lib/admin"
import {
  buildPublicUrlFromKey,
  getR2Config,
  isAllowedReportKey,
  makeR2Client,
} from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

type Category = "daily-report" | "weekly-report" | "research-report" | "ai-news"

function prefixForCategory(cat: Category): string {
  switch (cat) {
    case "daily-report":
      return "daily-report/"
    case "weekly-report":
      return "weekly-report/"
    case "research-report":
      return "research-report/"
    case "ai-news":
      return "ai-news/"
  }
}

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
    const body = await req.json().catch(() => null)
    const category = (body?.category as string | undefined) ?? null
    const filenameOverride = (body?.filename as string | undefined) ?? undefined
    const contentTypeOverride =
      (body?.contentType as string | undefined) ?? undefined

    if (
      !category ||
      !["daily-report", "weekly-report", "research-report", "ai-news"].includes(
        category
      )
    ) {
      return new Response(JSON.stringify({ error: "invalid_category" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const trimmed = filenameOverride?.trim()
    const name = trimmed && trimmed.length > 0 ? trimmed : null
    if (!name) {
      return new Response(JSON.stringify({ error: "invalid_filename" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const key = `${prefixForCategory(category as Category)}${name}`
    if (!isAllowedReportKey(key)) {
      return new Response(JSON.stringify({ error: "invalid_key", key }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const { bucket, baseUrl } = getR2Config()
    const client = makeR2Client()
    const contentType = contentTypeOverride || "application/octet-stream"

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const expiresIn = 300
    const uploadUrl = await getSignedUrl(client, command, { expiresIn })
    const url = buildPublicUrlFromKey(baseUrl, key)

    return new Response(
      JSON.stringify({ ok: true, key, url, uploadUrl, expiresIn }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    )
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
