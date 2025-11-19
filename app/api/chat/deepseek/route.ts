import { NextRequest } from "next/server"
import OpenAI from "openai"

type ChatRequestMessage = {
  role: "user" | "assistant"
  content: string
}

type ChatRequestBody = {
  messages?: ChatRequestMessage[]
  stream?: boolean
}

const apiUrl = "https://api.deepseek.com/v1"
const apiKey = process.env.DEEPSEEK_API_KEY

const openai = new OpenAI({
  baseURL: apiUrl,
  apiKey: apiKey,
})

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ChatRequestBody | null

  if (!body || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  if (!apiUrl || !apiKey) {
    return new Response(JSON.stringify({ error: "missing_configuration" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }

  // Streaming mode (plain text chunks)
  if (body.stream) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            stream: true,
            messages: body.messages!.map(message => ({
              role: message.role,
              content: message.content,
            })),
          })

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content
            if (!delta) continue
            controller.enqueue(encoder.encode(delta))
          }
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache",
      },
    })
  }

  try {
    console.log("Calling DeepSeek API with messages:", body)
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: body.messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    })

    const replyText =
      completion.choices[0]?.message?.content ??
      "DeepSeek did not return any content."

    return new Response(JSON.stringify({ message: replyText }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  } catch (error) {
    console.log("Deepseek api error", error)
    return new Response(JSON.stringify({ error: "network_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}
