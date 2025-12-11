import type { ReportType } from "@/app/[locale]/[customerID]/platform/lib/query-report-by-type"

export type AudioUrlSuccessResponse = { url: string }
export type AudioUrlErrorResponse = { error: string; message?: string }
export type AudioUrlResponse = AudioUrlSuccessResponse | AudioUrlErrorResponse

export async function fetchAudioUrl(
  type: ReportType | "dialy-report",
  fileName: string
): Promise<{ response: Response; data: AudioUrlResponse }> {
  const searchParams = new URLSearchParams({
    type,
    filename: fileName,
  })

  const response = await fetch(`/api/audio/url?${searchParams.toString()}`, {
    cache: "no-store",
  })

  let data: AudioUrlResponse
  try {
    data = await response.json()
  } catch {
    data = { error: "invalid_json" }
  }

  return { response, data }
}
