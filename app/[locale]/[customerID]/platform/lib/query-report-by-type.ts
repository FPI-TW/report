import type { ReportType } from "@/types/reports"
import { apiFetch, withAuthHeaders } from "@/lib/api/axios"

export async function queryReportByType(
  type: ReportType,
  page: number,
  months: number
) {
  const res = await apiFetch(`/${type}?page=${page}&months=${months}`, {
    headers: withAuthHeaders(),
  })
  if (!res.ok) throw new Error("failed")
  return res.json()
}
