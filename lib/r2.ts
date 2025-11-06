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

export const BRIEF_PREFIX = "廷豐金融科技晨報_"
export const BRIEF_REGEX = /^廷豐金融科技晨報_(\d{4}-\d{2}-\d{2})\.pdf$/

export type BriefObject = {
  key: string
  date: string // YYYY-MM-DD
  url: string
}

export function keyToBrief(
  key: string,
  publicBaseUrl: string
): BriefObject | null {
  const m = key.match(BRIEF_REGEX)
  if (!m) return null
  const date = m[1]!
  return {
    key,
    date,
    url: `${publicBaseUrl}/${encodeURIComponent(key)}`,
  }
}
