export const REPORT_CATEGORIES = [
  "daily-report",
  "weekly-report",
  "research-report",
  "ai-news",
] as const

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const BRAND = "#ddae58" as const

export const PREVIEW_MONTHS = 1
