import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyJwt } from "@/lib/session"
import {
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3"
import { makeR2Client, getR2Config, BRIEF_PREFIX, keyToBrief } from "@/lib/r2"

type Group = {
  year: number
  month: number // 1-12
  items: { key: string; date: string; url: string }[]
}

function toYearMonth(dateStr: string) {
  const d = new Date(dateStr)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

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

  // Collect all qualifying objects (see note: R2/S3 listing is ascending; we sort desc after)
  const briefs: { key: string; date: string; url: string }[] = []
  const client = makeR2Client()
  const { bucket, publicBaseUrl } = getR2Config()
  let continuation: string | undefined
  const maxKeys = 1000
  let guard = 0

  try {
    do {
      const resp: ListObjectsV2CommandOutput = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: BRIEF_PREFIX,
          ContinuationToken: continuation,
          MaxKeys: maxKeys,
        })
      )
      const contents = resp.Contents || []
      for (const obj of contents) {
        const key = obj.Key
        if (!key) continue
        const b = keyToBrief(key, publicBaseUrl)
        if (b) briefs.push(b)
      }
      continuation = resp.IsTruncated
        ? resp.NextContinuationToken || undefined
        : undefined
      guard += 1
      if (guard > 100) break // safety guard
    } while (continuation)
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "list_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    )
  }

  // Sort by date desc
  briefs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  // Group by year-month in desc order
  const ymMap = new Map<string, Group>()
  for (const b of briefs) {
    const { year, month } = toYearMonth(b.date)
    const key = `${year}-${month.toString().padStart(2, "0")}`
    if (!ymMap.has(key)) ymMap.set(key, { year, month, items: [] })
    ymMap.get(key)!.items.push(b)
  }

  // Order groups by year desc, month desc
  const allGroups = Array.from(ymMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const totalGroups = allGroups.length
  const offset = (page - 1) * monthsPerPage
  const slice = allGroups.slice(offset, offset + monthsPerPage)
  const hasPrev = page > 1 && totalGroups > 0
  const hasNext = offset + monthsPerPage < totalGroups

  return new Response(
    JSON.stringify({
      page,
      months: monthsPerPage,
      hasPrev,
      hasNext,
      groups: slice,
      totalGroups, // informational
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  )
}
