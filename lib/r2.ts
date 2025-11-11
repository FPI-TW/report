import { S3Client } from "@aws-sdk/client-s3"

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export function makeR2Client(): S3Client {
  const accountId = requireEnv("R2_ACCOUNT_ID")
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID")
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY")
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export function getR2Config() {
  return {
    bucket: requireEnv("R2_BUCKET"),
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL"),
  }
}

export const REPORT_PREFIX = "廷豐金融科技晨報_"
export const REPORT_REGEX = /^廷豐金融科技晨報_(\d{4}-\d{2}-\d{2})\.pdf$/
export const ALLOWED_REPORT_PREFIXES = [
  "daily-report/",
  "weekly-report/",
  "research-report/",
  "ai-news/",
]

export type ReportObject = {
  key: string
  date: string // YYYY-MM-DD
  url: string
}

export function keyToReport(
  key: string,
  publicBaseUrl: string
): ReportObject | null {
  const m = key.match(REPORT_REGEX)
  if (!m) return null
  const date = m[1]!
  return {
    key,
    date,
    url: buildPublicUrlFromKey(publicBaseUrl, key),
  }
}

export function isAllowedReportKey(key: string): boolean {
  if (!key) return false
  if (key.includes("..") || key.startsWith("/") || key.startsWith("\\"))
    return false
  return (
    REPORT_REGEX.test(key) ||
    ALLOWED_REPORT_PREFIXES.some(p => key.startsWith(p))
  )
}

export function buildPublicUrlFromKey(
  publicBaseUrl: string,
  key: string
): string {
  const parts = key.split("/").map(encodeURIComponent)
  return `${publicBaseUrl}/${parts.join("/")}`
}
