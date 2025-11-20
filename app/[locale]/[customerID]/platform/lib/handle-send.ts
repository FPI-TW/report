type ChatApiMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

type HandleSendParams = {
  reportType?: string | undefined
  reportDate?: string | undefined
  pdfText: string
  messages: ChatApiMessage[]
  signal: AbortSignal
  onDelta?: (chunk: string) => void
}

export async function handleSend({
  reportType,
  reportDate,
  pdfText,
  messages,
  signal,
  onDelta,
}: HandleSendParams): Promise<boolean> {
  const response = await fetch("/api/chat/deepseek", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    signal,
    body: JSON.stringify({
      reportType,
      reportDate,
      pdfText,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error("Request failed")
  }

  if (!response.body) {
    throw new Error("No response body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let receivedAnyChunk = false

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    if (!chunk) continue

    receivedAnyChunk = true
    onDelta?.(chunk)
  }

  return receivedAnyChunk
}
