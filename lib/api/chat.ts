export type ChatMessageRole = "user" | "assistant" | "system"

export type ChatMessagePayload = {
  role: ChatMessageRole
  content: string
}

export type ChatRequestBody = {
  reportType?: string
  reportDate?: string
  messages: ChatMessagePayload[]
}

export type ChatResponse = string

// export type ChatResponse = {
//   session_id: string
//   metaData: {
//     reportType: string
//     reportDate: string
//     language: string
//   }
//   response: {
//     role: string
//     content: string
//   }
// }

export async function createChatStream(
  body: ChatRequestBody,
  signal?: AbortSignal | null
): Promise<ChatResponse> {
  const response = await fetch("/api/chat/deepseek", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    signal: signal ?? null,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error("Request failed")
  }

  const text = await response.text()
  return text
}
