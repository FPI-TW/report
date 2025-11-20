export type UploadCategory =
  | "daily-report"
  | "weekly-report"
  | "research-report"
  | "ai-news"

export type UploadRequest = {
  category: UploadCategory
  filename: string
  contentType: string
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

export async function createUploadUrl(
  body: UploadRequest
): Promise<{ response: Response; data: UploadResponse }> {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as UploadResponse

  return { response, data }
}
