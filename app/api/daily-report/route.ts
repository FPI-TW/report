import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import { listReportGroupsByKind } from "@/lib/reports"

export async function GET(req: NextRequest) {
  const sessionToken = (await cookies()).get(COOKIE_NAME)?.value
  if (!sessionToken || !verifyJwt(sessionToken)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const monthsPerPage = Math.max(1, Number(searchParams.get("months") || 6))

  try {
    const data = await listReportGroupsByKind(
      "daily-report",
      page,
      monthsPerPage
    )
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (err) {
    console.error("Failed to list daily reports:", err)
    return new Response(
      JSON.stringify({
        error: "list_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    )
  }
}
