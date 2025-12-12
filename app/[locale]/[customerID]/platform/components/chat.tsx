"use client"

import type { KeyboardEvent, MouseEvent, UIEvent } from "react"
import useChat from "../hooks/useChat"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useDragControls } from "motion/react"
import { Button } from "@/components/ui/button"

import MarkdownPreview from "@uiw/react-markdown-preview"
import "@/app/[locale]/[customerID]/platform/markdown.css"
import { cn } from "@/lib/utils"

type ChatMessageRole = "user" | "assistant" | "system"

type ChatMessage = {
  id: number
  message: string
  sender: string
  direction: "incoming" | "outgoing"
  role: ChatMessageRole
}

type ChatProps = {
  reportType?: string
  reportDate?: string
  pdfText: string
}

export default function Chat({ reportType, reportDate, pdfText }: ChatProps) {
  const { chatWindow, dragConstraints } = useChat()
  const t = useTranslations("chat")
  const hasDraggedRef = useRef(false)
  const dragControls = useDragControls()

  return (
    <motion.div
      className="fixed right-4 bottom-4 z-50 sm:right-12 sm:bottom-6"
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDrag={() => {
        hasDraggedRef.current = true
      }}
      dragConstraints={dragConstraints}
    >
      <div className="relative flex flex-col items-end gap-3">
        <ChatWindow
          isOpen={chatWindow.isOpen}
          onClose={event => {
            event.stopPropagation()
            chatWindow.close()
          }}
          reportType={reportType}
          reportDate={reportDate}
          pdfText={pdfText}
        />

        <button
          type="button"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-linear-to-br from-sky-500 via-cyan-500 to-amber-400 shadow-[0_12px_30px_rgba(14,165,233,0.4)] transition hover:shadow-[0_16px_38px_rgba(245,158,11,0.45)] sm:h-12 sm:w-12"
          onPointerDown={event => {
            event.preventDefault()
            dragControls.start(event)
          }}
          onClick={event => {
            event.stopPropagation()
            if (hasDraggedRef.current) {
              hasDraggedRef.current = false
              return
            }

            chatWindow.toggle()
          }}
        >
          <span className="sr-only">{t("open_chat")}</span>
          <svg
            className="size-5 text-white sm:size-6"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M5 4h14a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H12l-3.8 3.3c-.6.5-1.5.1-1.5-.7V15H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
              fill="currentColor"
            />
            <circle cx="9.5" cy="10" r="1" fill="white" />
            <circle cx="14.5" cy="10" r="1" fill="white" />
            <path
              d="M11.5 13c.4.6 1.6.6 2 0"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

type ChatWindowProps = {
  isOpen: boolean
  onClose: (event: MouseEvent<HTMLButtonElement>) => void
  reportType?: string | undefined
  reportDate?: string | undefined
  pdfText: string
}

function ChatWindow({
  isOpen,
  onClose,
  reportType,
  reportDate,
  pdfText,
}: ChatWindowProps) {
  const t = useTranslations("chat")
  const initialMessages: ChatMessage[] = [
    {
      id: 1,
      message: t("welcome"),
      sender: "Assistant",
      direction: "incoming",
      role: "assistant",
    },
  ]
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const lockedScrollTopRef = useRef<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [attachedText, setAttachedText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)
  const { chatHightlight } = useChat()

  function handleMessageListScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const threshold = 100
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight

    lockedScrollTopRef.current = target.scrollTop
    setIsAtBottom(distanceFromBottom <= threshold)
  }

  function handleScrollToBottom() {
    const container = messageListRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }

  const handleSend = useCallback(
    async (rawText?: string) => {
      const text = rawText ?? input
      const content = text.trim()
      if (!content || isSending) return
      const messageContent = attachedText
        ? `${content}\n\n${t("reference")}\n${attachedText}`
        : content

      const userMessage: ChatMessage = {
        id: Date.now(),
        message: messageContent,
        sender: "You",
        direction: "outgoing",
        role: "user",
      }

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        message: "",
        sender: "Assistant",
        direction: "incoming",
        role: "assistant",
      }

      const history = [...messages, userMessage]

      // Show user + empty assistant message to fill later
      setMessages([...history, assistantMessage])
      setInput("")

      if (messageListRef.current) {
        lockedScrollTopRef.current = messageListRef.current.scrollTop
      }

      const controller = new AbortController()
      setAbortController(controller)
      setIsSending(true)

      let receivedAnyChunk = false

      try {
        setAttachedText("")

        const response = await fetch("/api/chat/deepseek", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            reportType,
            reportDate,
            pdfText,
            messages: history
              .filter(item => item.role !== "system")
              .map(item => ({
                role: item.role,
                content: item.message,
              })),
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

        for (;;) {
          const { value, done } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          if (!chunk) continue

          receivedAnyChunk = true

          setMessages(prev => {
            const existing = prev.find(m => m.id === assistantMessage.id)
            if (!existing) {
              return [
                ...prev,
                {
                  ...assistantMessage,
                  message: chunk,
                },
              ]
            }
            return prev.map(message =>
              message.id === assistantMessage.id
                ? { ...message, message: message.message + chunk }
                : message
            )
          })
        }

        if (!receivedAnyChunk) {
          setMessages(prev =>
            prev.map(message =>
              message.id === assistantMessage.id && !message.message.trim()
                ? {
                    ...message,
                    message: t("no_content"),
                  }
                : message
            )
          )
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setMessages(prev => {
            const existing = prev.find(m => m.id === assistantMessage.id)
            if (!existing) {
              return [
                ...prev,
                {
                  ...assistantMessage,
                  message: t("generation_stopped"),
                },
              ]
            }
            return prev.map(message =>
              message.id === assistantMessage.id && !message.message.trim()
                ? {
                    ...message,
                    message: t("generation_stopped"),
                  }
                : message
            )
          })
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now() + 2,
              message: t("api_error"),
              sender: "System",
              direction: "incoming",
              role: "system",
            },
          ])
        }
      } finally {
        setIsSending(false)
        setAbortController(null)
      }

      if (messageListRef.current) {
        lockedScrollTopRef.current = messageListRef.current.scrollTop
      }
    },
    [
      attachedText,
      input,
      isSending,
      messages,
      pdfText,
      reportDate,
      reportType,
      t,
    ]
  )

  useEffect(() => {
    if (isSending) return
    if (!chatHightlight.text) return

    const content = chatHightlight.text.trim()
    if (!content) {
      chatHightlight.clear()
      return
    }

    if (chatHightlight.featureType === "ai-insights") {
      setInput(content)
      void handleSend(content)
      chatHightlight.clear()
      return
    }

    if (chatHightlight.featureType === "deep-query") {
      setAttachedText(content)
      chatHightlight.clear()
    }
  }, [
    isSending,
    chatHightlight,
    chatHightlight.text,
    chatHightlight.featureType,
    handleSend,
  ])

  function handleStop() {
    if (!abortController) return
    abortController.abort()
  }

  function handleRemoveAttachedText() {
    setAttachedText("")
    chatHightlight.clear()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const isComposing =
      event.nativeEvent?.isComposing || event.key === "Process"

    if (isComposing) return

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  // 取消自動滾動功能，避免在輸入時不斷滾動，影響閱讀
  useEffect(() => {
    if (!isSending) return
    const container = messageListRef.current
    if (!container) return
    if (lockedScrollTopRef.current === null) return

    container.scrollTop = lockedScrollTopRef.current
  }, [messages, isSending])

  return (
    <div
      className={`absolute right-0 bottom-[calc(100%+12px)] w-[min(100vw-2.5rem,38rem)] overflow-hidden rounded-2xl border border-cyan-100/70 bg-linear-to-br from-white via-sky-50 to-amber-50 shadow-[0_16px_40px_rgba(14,165,233,0.18)] transition duration-150 sm:bottom-16 ${
        isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!isOpen}
      hidden={!isOpen}
    >
      <header className="flex items-center justify-between gap-3 border-b border-cyan-100/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-amber-400 text-white shadow-inner shadow-sky-100">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v7.75a1.5 1.5 0 0 1-1.5 1.5H11l-3.5 3V14h-2A1.5 1.5 0 0 1 4 12.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-sm leading-tight font-semibold sm:text-base">
              {t("title")}
            </div>
            <div className="text-[11px] font-medium tracking-[0.22em] text-sky-600 uppercase">
              AI Copilot
            </div>
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground rounded-full px-2 py-1 text-xs hover:bg-sky-50"
          onClick={onClose}
          aria-label={t("close_chat")}
          title={t("close_chat")}
        >
          ✕
        </button>
      </header>

      <div className="h-[min(480px,55vh)] text-xs md:text-sm">
        <div className="relative flex h-full flex-col">
          <div
            ref={messageListRef}
            className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
            onScroll={handleMessageListScroll}
          >
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${
                  message.direction === "outgoing"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl border px-3 py-2 leading-relaxed shadow-sm",
                    message.direction === "outgoing"
                      ? "text-foreground border-cyan-100 bg-white"
                      : "text-foreground border-cyan-100/70 bg-linear-to-br from-cyan-50 to-amber-50"
                  )}
                >
                  {message.role === "assistant" &&
                  !message.message.trim() &&
                  isSending ? (
                    <span className="flex items-center gap-1">
                      <span className="sr-only">{t("loading_response")}</span>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current delay-150" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current delay-300" />
                    </span>
                  ) : (
                    <MarkdownPreview
                      source={message.message}
                      className="text-sm leading-normal"
                      style={{ backgroundColor: "transparent" }}
                      wrapperElement={{ "data-color-mode": "light" }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isAtBottom && (
            <button
              type="button"
              className="text-foreground absolute right-3 bottom-20 z-10 rounded-full border border-cyan-100 bg-white/90 px-3 py-1 text-[11px] shadow hover:bg-sky-50"
              onClick={handleScrollToBottom}
            >
              {t("scroll_to_latest")}
            </button>
          )}

          <div className="border-t border-cyan-100/70 bg-white/80 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-2">
              {attachedText && (
                <div className="relative rounded-lg border border-cyan-100 bg-white px-3 py-2 shadow-sm">
                  <div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                    {t("attached_title")}
                  </div>
                  <div className="text-foreground/70 whitespace-no-wrap max-h-24 truncate overflow-y-auto pt-1 text-xs leading-relaxed">
                    {attachedText}
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded p-1 text-xs"
                    onClick={handleRemoveAttachedText}
                    aria-label={t("remove_attached")}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  className="h-12 flex-1 resize-none rounded border border-cyan-100 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  placeholder={t("placeholder")}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending && !abortController}
                />

                {isSending && abortController ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded-full border-cyan-200 px-4 text-xs shadow-sm"
                    onClick={handleStop}
                  >
                    {t("stop")}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="h-8 rounded-full bg-amber-500/90 px-4 text-xs text-white shadow-md transition hover:brightness-105 disabled:opacity-30"
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || isSending}
                  >
                    {t("send")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
