import { NextRequest } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { BRIEF_REGEX, getR2Config, makeR2Client } from "@/lib/r2"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key") || ""
  if (!BRIEF_REGEX.test(key)) {
    return new Response(JSON.stringify({ error: "invalid_key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  try {
    const { bucket } = getR2Config()
    const client = makeR2Client()
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
    const url = await getSignedUrl(client, cmd, { expiresIn: 300 })
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Referrer-Policy": "no-referrer",
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
