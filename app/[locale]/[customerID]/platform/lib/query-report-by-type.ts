export type ReportType =
  | "daily-report"
  | "weekly-report"
  | "research-report"
  | "ai-news"

export async function queryReportByType(
  type: ReportType,
  page: number,
  months: number
) {
  const res = await fetch(`/api/${type}?page=${page}&months=${months}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("failed")
  return res.json()
}
