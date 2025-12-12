import { makeR2Client, getR2Config, buildPublicUrlFromKey } from "@/lib/r2"
import {
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3"

export type ReportKind =
  | "daily-report"
  | "ai-news"
  | "weekly-report"
  | "research-report"

export type ReportFileType = "pdf" | "audio"

export type ReportItem = { key: string; date: string; url: string }
export type ReportGroup = { year: number; month: number; items: ReportItem[] }

function toYearMonth(dateStr: string) {
  const d = new Date(dateStr)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function prefixForKind(kind: ReportKind, fileType: ReportFileType): string {
  return `${kind}/${fileType}/`
}

function fallbackKeyToReport(key: string, baseUrl: string): ReportItem | null {
  // Tries to extract a date anywhere in the key to support new categories
  const m = key.match(/(\d{4}-\d{2}-\d{2})/)
  if (!m) return null
  const date = m[1]!
  return { key, date, url: buildPublicUrlFromKey(baseUrl, key) }
}

function keyToReportByKind(
  kind: ReportKind,
  key: string,
  baseUrl: string
): ReportItem | null {
  // For folder-based categories (including daily-report), derive date from key
  // by extracting YYYY-MM-DD found in the filename/path.
  // This remains compatible with various naming conventions.
  if (kind === "daily-report") return fallbackKeyToReport(key, baseUrl)
  return fallbackKeyToReport(key, baseUrl)
}

export async function listReportGroupsByKind(
  kind: ReportKind,
  page: number,
  monthsPerPage: number,
  fileType: ReportFileType = "pdf"
): Promise<{
  page: number
  months: number
  hasPrev: boolean
  hasNext: boolean
  groups: ReportGroup[]
  totalGroups: number
}> {
  const client = makeR2Client()
  const { bucket, baseUrl } = getR2Config()
  const prefix = prefixForKind(kind, fileType)

  const items: ReportItem[] = []
  let continuation: string | undefined
  const maxKeys = 1000
  let guard = 0

  do {
    const resp: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuation,
        MaxKeys: maxKeys,
      })
    )
    const contents = resp?.Contents || []

    for (const obj of contents) {
      const key = obj.Key
      if (!key) continue
      const item = keyToReportByKind(kind, key, baseUrl)
      if (item) items.push(item)
    }
    continuation = resp.IsTruncated
      ? resp.NextContinuationToken || undefined
      : undefined
    guard += 1
    if (guard > 100) break
  } while (continuation)

  // Sort by date desc
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  // Group by year-month
  const ymMap = new Map<string, ReportGroup>()
  for (const it of items) {
    const { year, month } = toYearMonth(it.date)
    const key = `${year}-${String(month).padStart(2, "0")}`
    if (!ymMap.has(key)) ymMap.set(key, { year, month, items: [] })
    ymMap.get(key)!.items.push(it)
  }

  const allGroups = Array.from(ymMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const totalGroups = allGroups.length
  const offset = (page - 1) * monthsPerPage
  const slice = allGroups.slice(offset, offset + monthsPerPage)
  const hasPrev = page > 1 && totalGroups > 0
  const hasNext = offset + monthsPerPage < totalGroups

  return {
    page,
    months: monthsPerPage,
    hasPrev,
    hasNext,
    groups: slice,
    totalGroups,
  }
}
