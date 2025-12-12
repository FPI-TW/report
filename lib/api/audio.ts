export type AudioUrlSuccessResponse = { url: string }
export type AudioUrlErrorResponse = { error: string; message?: string }
export type AudioUrlResponse = AudioUrlSuccessResponse | AudioUrlErrorResponse

export async function fetchAudioUrl(
  key: string
): Promise<{ response: Response; data: AudioUrlResponse }> {
  const response = await fetch(
    `/api/audio/url?key=${encodeURIComponent(key)}`,
    { cache: "no-store" }
  )

  let data: AudioUrlResponse
  try {
    data = await response.json()
  } catch {
    data = { error: "invalid_json" }
  }

  return { response, data }
}
