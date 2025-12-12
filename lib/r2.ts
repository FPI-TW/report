import { S3Client } from "@aws-sdk/client-s3"
import { REPORT_TYPES, type ReportType } from "@/types/reports"

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
    baseUrl: requireEnv("R2_BASE_URL"),
  }
}

export const REPORT_PREFIX = "廷豐金融科技晨報_"
export const REPORT_REGEX = /^廷豐金融科技晨報_(\d{4}-\d{2}-\d{2})\.pdf$/
export const ALLOWED_REPORT_PREFIXES = REPORT_TYPES.map(type => `${type}/`)
export const ALLOWED_PDF_PREFIXES = REPORT_TYPES.map(type => `${type}/pdf/`)
export const ALLOWED_AUDIO_PREFIXES = REPORT_TYPES.map(type => `${type}/audio/`)

export type ReportObject = {
  key: string
  date: string // YYYY-MM-DD
  url: string
}

export function keyToReport(key: string, baseUrl: string): ReportObject | null {
  const m = key.match(REPORT_REGEX)
  if (!m) return null
  const date = m[1]!
  return {
    key,
    date,
    url: buildPublicUrlFromKey(baseUrl, key),
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

export function buildPublicUrlFromKey(baseUrl: string, key: string): string {
  const parts = key.split("/").map(encodeURIComponent)
  return `${baseUrl}/${parts.join("/")}`
}

function sanitizeFileName(fileName: string): string | null {
  const trimmed = fileName.trim()
  if (!trimmed) return null
  const withoutExtension = trimmed.replace(/\.[^.]+$/, "")
  const sanitized = withoutExtension.replace(/[\\]/g, "-").replace(/\//g, "-")
  return sanitized.trim().length > 0 ? sanitized : null
}

export function buildAudioObjectKey(
  type: ReportType,
  fileName: string
): string | null {
  if (!type || !fileName) return null

  const sanitized = sanitizeFileName(fileName)
  if (!sanitized) return null

  return `${type}/audio/${sanitized}.mp3`
}

export function buildPdfObjectKey(
  type: ReportType,
  fileName: string
): string | null {
  if (!type || !fileName) return null

  const sanitized = sanitizeFileName(fileName)
  if (!sanitized) return null

  return `${type}/pdf/${sanitized}.pdf`
}

export function isAllowedAudioKey(key: string): boolean {
  if (!key) return false
  if (key.includes("..") || key.startsWith("/") || key.startsWith("\\"))
    return false
  return ALLOWED_AUDIO_PREFIXES.some(prefix => key.startsWith(prefix))
}

export function isAllowedPdfKey(key: string): boolean {
  if (!key) return false
  if (key.includes("..") || key.startsWith("/") || key.startsWith("\\"))
    return false
  return ALLOWED_PDF_PREFIXES.some(prefix => key.startsWith(prefix))
}
