import type { ReportType } from "@/app/[locale]/[customerID]/platform/lib/query-report-by-type"

export type ApiReport = { key: string; date: string; url: string }
export type ApiGroup = { year: number; month: number; items: ApiReport[] }

export type ReportsListResponse = {
  page: number
  months: number
  hasPrev: boolean
  hasNext: boolean
  groups: ApiGroup[]
}

export type ReportsListError = {
  error: string
  message?: string
}

export async function fetchReportsByType(
  type: ReportType,
  page: number,
  months: number
): Promise<{
  response: Response
  data: ReportsListResponse | ReportsListError
}> {
  const response = await fetch(`/api/${type}?page=${page}&months=${months}`, {
    cache: "no-store",
  })

  const data = (await response.json().catch(() => ({}))) as
    | ReportsListResponse
    | ReportsListError

  return { response, data }
}

export type ReportUrlSuccessResponse = { url: string }

export type ReportUrlErrorResponse = {
  error: string
  message?: string
}

export type ReportUrlResponse =
  | ReportUrlSuccessResponse
  | ReportUrlErrorResponse

export async function fetchReportUrl(
  key: string
): Promise<{ response: Response; data: ReportUrlResponse }> {
  const response = await fetch(
    `/api/reports/url?key=${encodeURIComponent(key)}`,
    {
      cache: "no-store",
    }
  )

  const data = (await response.json().catch(() => ({}))) as ReportUrlResponse

  return { response, data }
}

export type DeleteReportResponse =
  | { ok: true; key: string }
  | { error: string; message?: string }

export async function deleteReport(
  key: string
): Promise<{ response: Response; data: DeleteReportResponse }> {
  const response = await fetch("/api/reports/delete", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  })

  const data = (await response.json().catch(() => ({}))) as DeleteReportResponse
  return { response, data }
}
