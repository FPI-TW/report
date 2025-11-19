import { NextRequest } from "next/server"
import OpenAI from "openai"
import { cookies } from "next/headers"

import { defaultLocale } from "@/proxy/language"
import { BASIC_PROMPT, PARAMS_PROMPT, RESPONSE_HINT } from "./constant"

type ChatRequestMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

type ChatRequestBody = {
  reportType?: string
  reportDate?: string
  messages?: ChatRequestMessage[]
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

  // Locale and report metadata will be threaded into prompts laterconst cookieStore = await cookies()
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || defaultLocale
  const reportType = body?.reportType || "daily report"
  const reportDate = body?.reportDate || new Date().toISOString().split("T")[0]

  const system_prompt =
    BASIC_PROMPT +
    `Local: ${locale}` +
    PARAMS_PROMPT +
    `${reportType ? `Report Type: ${reportType}` : ""}, Report Date: ${reportDate ? reportDate : ""}` +
    RESPONSE_HINT

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...body.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "system",
      content: system_prompt,
    },
  ]

  try {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            stream: true,
            messages,
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
  } catch (error) {
    console.log("Deepseek api error", error)
    return new Response(JSON.stringify({ error: "network_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}
