import type { ReportType } from "@/types/reports"
import { apiFetch, withAuthHeaders } from "./axios"

export type UploadCategory = ReportType

export type UploadPdfRequest = {
  category: ReportType
  filename: string
}

export type UploadAudioRequest = {
  category: ReportType
  filename: string
  contentType?: string
}

export type UploadSuccessResponse = {
  ok: true
  key: string
  url: string
  uploadUrl: string
  expiresIn: number
}

export type UploadErrorResponse = {
  ok?: false
  error?: string
  message?: string
  key?: string
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse

async function requestUploadUrl(
  endpoint: string,
  body: UploadPdfRequest | UploadAudioRequest
): Promise<{ response: Response; data: UploadResponse }> {
  const response = await apiFetch(endpoint, {
    method: "POST",
    headers: withAuthHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as UploadResponse

  return { response, data }
}

export function createPdfUploadUrl(
  body: UploadPdfRequest
): Promise<{ response: Response; data: UploadResponse }> {
  return requestUploadUrl("/upload/pdf", body)
}

export function createAudioUploadUrl(
  body: UploadAudioRequest
): Promise<{ response: Response; data: UploadResponse }> {
  return requestUploadUrl("/upload/audio", body)
}
