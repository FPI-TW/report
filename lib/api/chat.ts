import { apiClient, withAuthHeaders } from "./axios"

export type ChatMessageRole = "user" | "assistant" | "system"

export type ChatMessagePayload = {
  role: ChatMessageRole
  content: string
}

export type CreateChatParams = {
  reportType?: string
  reportDate?: string
  pdfContent: string
  messages: ChatMessagePayload[]
  signal?: AbortSignal
  onDelta?: (chunk: string) => void
}

export type CreateChatResult = {
  fullText: string
  receivedAnyChunk: boolean
}

const CHAT_AUTH_REQUIRED_ERROR = "CHAT_AUTH_REQUIRED" as const
const SSE_DONE_SENTINEL = "[DONE]" as const

const _decodeSseDataLine = (line: string): string => {
  const value = line.slice(5)
  return value.startsWith(" ") ? value.slice(1) : value
}

const _drainSseBuffer = (
  buffer: string,
  flush: boolean
): { events: string[]; buffer: string } => {
  const normalized = buffer.replace(/\r/g, "")
  const events: string[] = []
  let rest = normalized

  const parseBlock = (block: string): string | null => {
    if (!block.trim()) return null
    const dataLines: string[] = []
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue
      dataLines.push(_decodeSseDataLine(line))
    }
    if (dataLines.length === 0) return null
    return dataLines.join("\n")
  }

  while (true) {
    const delimiterIndex = rest.indexOf("\n\n")
    if (delimiterIndex < 0) break

    const block = rest.slice(0, delimiterIndex)
    rest = rest.slice(delimiterIndex + 2)
    const parsed = parseBlock(block)
    if (parsed !== null) {
      events.push(parsed)
    }
  }

  if (flush && rest) {
    const parsed = parseBlock(rest)
    if (parsed !== null) {
      events.push(parsed)
    }
    rest = ""
  }

  return { events, buffer: rest }
}

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
  pdfContent,
  messages,
  signal,
  onDelta,
}: CreateChatParams): Promise<CreateChatResult> {
  const headers = withAuthHeaders({
    "content-type": "application/json",
    accept: "text/event-stream",
  })

  if (!headers.has("authorization")) {
    throw new Error(CHAT_AUTH_REQUIRED_ERROR)
  }

  let receivedAnyChunk = false
  let streamedText = ""

  const payload: {
    reportType?: string
    reportDate?: string
    pdfContent: string
    messages: ChatMessagePayload[]
  } = {
    pdfContent: typeof pdfContent === "string" ? pdfContent : "",
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
    const contentType =
      response.headers.get("content-type")?.toLowerCase() || ""
    const isSse = contentType.includes("text/event-stream")
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ""

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      if (!chunk) continue

      if (isSse) {
        sseBuffer += chunk
        const drained = _drainSseBuffer(sseBuffer, false)
        sseBuffer = drained.buffer
        for (const eventData of drained.events) {
          if (eventData === SSE_DONE_SENTINEL) continue
          streamedText += eventData
          receivedAnyChunk = true
          onDelta?.(eventData)
        }
        continue
      }

      streamedText += chunk
      receivedAnyChunk = true
      onDelta?.(chunk)
    }

    const tail = decoder.decode()
    if (isSse) {
      if (tail) {
        sseBuffer += tail
      }
      const drained = _drainSseBuffer(sseBuffer, true)
      for (const eventData of drained.events) {
        if (eventData === SSE_DONE_SENTINEL) continue
        streamedText += eventData
        receivedAnyChunk = true
        onDelta?.(eventData)
      }
    } else if (tail) {
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
