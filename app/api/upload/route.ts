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
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const { category, filename, contentType } = (body ?? {}) as {
      category?: string
      filename?: string
      contentType?: string
    }

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

    const name = (filename && filename.trim()) || ""
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

    const uploadContentType =
      (contentType && contentType.trim()) || "application/octet-stream"

    const { bucket, baseUrl } = getR2Config()
    const client = makeR2Client()
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: uploadContentType,
      }),
      { expiresIn: 60 * 60 }
    )

    const url = buildPublicUrlFromKey(baseUrl, key)
    return new Response(JSON.stringify({ ok: true, key, url, uploadUrl }), {
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
