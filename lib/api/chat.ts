import { apiClient, withAuthHeaders } from "./axios"

export type ChatMessageRole = "user" | "assistant" | "system"

export type ChatMessagePayload = {
  role: ChatMessageRole
  content: string
}

export type CreateChatParams = {
  reportType?: string
  reportDate?: string
  pdfText: string
  messages: ChatMessagePayload[]
  signal?: AbortSignal
  onDelta?: (chunk: string) => void
}

export type CreateChatResult = {
  fullText: string
  receivedAnyChunk: boolean
}

const CHAT_AUTH_REQUIRED_ERROR = "CHAT_AUTH_REQUIRED" as const

const toHeaderObject = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

export const isChatAuthRequiredError = (error: unknown): boolean => {
  return error instanceof Error && error.message === CHAT_AUTH_REQUIRED_ERROR
}

export async function createChat({
  reportType,
  reportDate,
  pdfText,
  messages,
  signal,
  onDelta,
}: CreateChatParams): Promise<CreateChatResult> {
  const headers = withAuthHeaders({
    "content-type": "application/json",
  })

  if (!headers.has("authorization")) {
    throw new Error(CHAT_AUTH_REQUIRED_ERROR)
  }

  let receivedAnyChunk = false
  let streamedText = ""

  const payload: {
    reportType?: string
    reportDate?: string
    pdfText: string
    messages: ChatMessagePayload[]
  } = {
    pdfText: typeof pdfText === "string" ? pdfText : "",
    messages,
  }

  if (reportType !== undefined) {
    payload.reportType = reportType
  }
  if (reportDate !== undefined) {
    payload.reportDate = reportDate
  }

  const baseURL = apiClient.defaults.baseURL
  if (!baseURL) {
    throw new Error("CHAT_API_BASE_URL_MISSING")
  }

  const requestInit: RequestInit = {
    method: "POST",
    headers: toHeaderObject(headers),
    body: JSON.stringify(payload),
  }
  if (signal) {
    requestInit.signal = signal
  }

  const response = await fetch(
    `${baseURL.replace(/\/+$/, "")}/chat`,
    requestInit
  )

  if (!response.ok) {
    throw new Error("Request failed")
  }

  if (response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      if (!chunk) continue

      streamedText += chunk
      receivedAnyChunk = true
      onDelta?.(chunk)
    }

    const tail = decoder.decode()
    if (tail) {
      streamedText += tail
      receivedAnyChunk = true
      onDelta?.(tail)
    }
  } else {
    const fullText = await response.text()
    if (fullText) {
      streamedText = fullText
      receivedAnyChunk = true
      onDelta?.(fullText)
    }
  }

  return {
    fullText: streamedText,
    receivedAnyChunk,
  }
}
