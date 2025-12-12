import { NextRequest } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  buildAudioObjectKey,
  buildPublicUrlFromKey,
  getR2Config,
  isAllowedAudioKey,
  makeR2Client,
} from "@/lib/r2"
import {
  parseCategory,
  parseFilename,
  requireSuperUser,
  UPLOAD_URL_EXPIRES,
} from "../utils"

export async function POST(req: NextRequest) {
  const authError = await requireSuperUser()
  if (authError) return authError

  try {
    const body = await req.json().catch(() => null)
    const category = parseCategory(body?.category)
    const filename = parseFilename(body?.filename)
    const contentType =
      typeof body?.contentType === "string" &&
      body.contentType.trim().length > 0
        ? body.contentType
        : "audio/mpeg"

    if (!category) {
      return new Response(JSON.stringify({ error: "invalid_category" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    if (!filename) {
      return new Response(JSON.stringify({ error: "invalid_filename" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const key = buildAudioObjectKey(category, filename)
    if (!key || !isAllowedAudioKey(key)) {
      return new Response(JSON.stringify({ error: "invalid_key", key }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const { bucket, baseUrl } = getR2Config()
    const client = makeR2Client()

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: UPLOAD_URL_EXPIRES,
    })
    const url = buildPublicUrlFromKey(baseUrl, key)

    return new Response(
      JSON.stringify({
        ok: true,
        key,
        url,
        uploadUrl,
        expiresIn: UPLOAD_URL_EXPIRES,
      }),
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
