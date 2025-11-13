import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { isSuperUserClaims } from "@/lib/admin"
import { isAllowedReportKey, getR2Config, makeR2Client } from "@/lib/r2"
import { PutObjectCommand } from "@aws-sdk/client-s3"

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
    const form = await req.formData()
    const category = form.get("category") as string | null
    const file = form.get("file") as File | null
    const filenameOverride =
      (form.get("filename") as string | null) || undefined

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

    if (!file || typeof file.arrayBuffer !== "function") {
      return new Response(JSON.stringify({ error: "missing_file" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const name = (filenameOverride && filenameOverride.trim()) || file.name
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

    const body = Buffer.from(await file.arrayBuffer())
    const contentType = file.type || "application/octet-stream"

    const { bucket, baseUrl } = getR2Config()
    const client = makeR2Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )

    const url = `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`
    return new Response(JSON.stringify({ ok: true, key, url }), {
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
