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

export async function createChatStream(body: ChatRequestBody) {
  const response = await fetch("/api/chat/deepseek", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  return response
}
