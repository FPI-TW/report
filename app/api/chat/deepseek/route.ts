import { NextRequest } from "next/server"

type ChatRequestMessage = {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    messages?: ChatRequestMessage[]
  } | null

  if (!body || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  // DeepSeek integration will be added in a follow-up.
  // For now, respond with a placeholder so the UI works end-to-end.
  const lastUserMessage = [...body.messages]
    .reverse()
    .find(message => message.role === "user")

  const replyText = lastUserMessage?.content?.trim().length
    ? `DeepSeek (placeholder): you said "${lastUserMessage.content}".`
    : "DeepSeek (placeholder): ask me anything about your reports."

  return new Response(JSON.stringify({ message: replyText }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}
