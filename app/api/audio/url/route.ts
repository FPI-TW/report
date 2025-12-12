import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  buildAudioObjectKey,
  getR2Config,
  isAllowedAudioKey,
  makeR2Client,
} from "@/lib/r2"
import { isReportType, REPORT_TYPES, type ReportType } from "@/types/reports"

export async function GET(req: NextRequest) {
  const sessionToken = (await cookies()).get(COOKIE_NAME)?.value
  if (!sessionToken || !verifyJwt(sessionToken)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  const { searchParams } = new URL(req.url)
  const keyParam = searchParams.get("key") || ""
  const requestedType = searchParams.get("type") || ""
  const fileName = searchParams.get("filename") || ""

  const type: ReportType = isReportType(requestedType)
    ? requestedType
    : REPORT_TYPES[0]

  const resolvedKey = keyParam || buildAudioObjectKey(type, fileName)

  if (!resolvedKey || !isAllowedAudioKey(resolvedKey)) {
    return new Response(JSON.stringify({ error: "invalid_key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  try {
    const { bucket } = getR2Config()
    const client = makeR2Client()

    // Ensure the object exists before signing
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: resolvedKey,
        })
      )
    } catch (err) {
      const statusCode =
        (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
          ?.httpStatusCode ?? 500
      if (statusCode === 404) {
        return new Response(
          JSON.stringify({ error: "not_found", message: "Audio not found" }),
          {
            status: 404,
            headers: { "content-type": "application/json" },
          }
        )
      }
      return new Response(
        JSON.stringify({
          error: "head_failed",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      )
    }

    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: resolvedKey,
      ResponseContentDisposition: "inline",
      ResponseContentType: "audio/mpeg",
    })
    const url = await getSignedUrl(client, cmd, { expiresIn: 300 })

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "sign_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    )
  }
}
