export type ReportKind =
  | "daily-report"
  | "weekly-report"
  | "research-report"
  | "ai-news"

export async function queryReportByKind(
  kind: ReportKind,
  page: number,
  months: number
) {
  const res = await fetch(`/api/${kind}?page=${page}&months=${months}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("failed")
  return res.json()
}
