export const REPORT_TYPES = [
  "daily-report",
  "weekly-report",
  "research-report",
  "ai-news",
] as const

export type ReportType = (typeof REPORT_TYPES)[number]

export function isReportType(value: unknown): value is ReportType {
  return typeof value === "string" && REPORT_TYPES.includes(value as ReportType)
}
