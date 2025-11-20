"use client"

import type { KeyboardEvent, MouseEvent, UIEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useDragControls } from "motion/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import useChat from "../hooks/useChat"

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
      className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
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
      <div className="relative flex flex-col items-end gap-2">
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
          className="bg-background hover:bg-muted flex h-11 w-11 cursor-move items-center justify-center rounded-full border shadow-lg sm:h-12 sm:w-12"
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
            className="text-foreground h-5 w-5 sm:h-6 sm:w-6"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 5h16v9H7l-3 3V5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
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
      className={`bg-background absolute right-0 bottom-14 w-[min(100vw-2.5rem,36rem)] overflow-hidden rounded-lg border shadow-lg transition duration-150 sm:bottom-16 ${
        isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
      aria-hidden={!isOpen}
      hidden={!isOpen}
    >
      <header className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-semibold sm:text-base">{t("title")}</div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted rounded-full px-2 py-1 text-xs"
          onClick={onClose}
          aria-label={t("close_chat")}
          title={t("close_chat")}
        >
          ✕
        </button>
      </header>

      <div className="h-[min(450px,50vh)] text-xs md:text-sm">
        <div className="relative flex h-full flex-col">
          <div
            ref={messageListRef}
            className="flex-1 space-y-2 overflow-y-auto px-3 py-2"
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
                  className={`max-w-[85%] rounded-md border px-2 py-1 leading-relaxed whitespace-pre-wrap ${
                    message.direction === "outgoing"
                      ? "bg-muted/60 text-foreground border-border"
                      : "bg-muted/60 text-foreground border-primary/20"
                  }`}
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
                    message.message
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isAtBottom && (
            <button
              type="button"
              className="bg-background/90 hover:bg-muted text-foreground absolute right-3 bottom-20 z-10 rounded-full border px-3 py-1 text-[11px] shadow"
              onClick={handleScrollToBottom}
            >
              {t("scroll_to_latest")}
            </button>
          )}

          <div className="bg-muted/30 border-t px-3 py-3">
            <div className="flex flex-col gap-2">
              {attachedText && (
                <div className="bg-background relative rounded-md border px-3 py-2 shadow-sm">
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
                  className="bg-background focus-visible:ring-ring h-12 flex-1 resize-none rounded border px-2 py-2 text-sm outline-none focus-visible:ring-1"
                  placeholder={t("placeholder")}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending && !abortController}
                />

                {isSending && abortController ? (
                  <Button
                    variant="outline"
                    className="h-8 rounded px-3 text-xs"
                    onClick={handleStop}
                  >
                    {t("stop")}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="h-8 rounded px-3 text-xs disabled:opacity-20"
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
