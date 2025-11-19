"use client"

import type { KeyboardEvent, MouseEvent, UIEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"

type ChatMessageRole = "user" | "assistant" | "system"

type ChatMessage = {
  id: number
  message: string
  sender: string
  direction: "incoming" | "outgoing"
  role: ChatMessageRole
}

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false)
  const hasDraggedRef = useRef(false)
  const constraints = useDragConstraints()

  return (
    <motion.div
      className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
      drag
      dragMomentum={false}
      dragElastic={0}
      onDrag={() => {
        hasDraggedRef.current = true
      }}
      dragConstraints={constraints}
    >
      <div className="relative flex flex-col items-end gap-2">
        {isOpen && (
          <ChatWindow
            onClose={event => {
              event.stopPropagation()
              setIsOpen(false)
            }}
          />
        )}

        <button
          type="button"
          className="bg-background hover:bg-muted flex h-11 w-11 cursor-move items-center justify-center rounded-full border shadow-lg sm:h-12 sm:w-12"
          onClick={event => {
            event.stopPropagation()
            if (hasDraggedRef.current) {
              hasDraggedRef.current = false
              return
            }
            setIsOpen(open => !open)
          }}
        >
          <span className="sr-only">Open chat</span>
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

const margin = 16 as const
const size = 64 as const
function useDragConstraints() {
  const [constraints, setConstraints] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  })

  useEffect(() => {
    function updateConstraints() {
      if (typeof window === "undefined") return

      const maxX = window.innerWidth - margin - size
      const maxY = window.innerHeight - margin - size

      setConstraints({
        top: -maxY,
        left: -maxX,
        right: 0,
        bottom: 0,
      })
    }

    updateConstraints()
    window.addEventListener("resize", updateConstraints)

    return () => {
      window.removeEventListener("resize", updateConstraints)
    }
  }, [])

  return constraints
}

type ChatWindowProps = {
  onClose: (event: MouseEvent<HTMLButtonElement>) => void
}

function ChatWindow({ onClose }: ChatWindowProps) {
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const lockedScrollTopRef = useRef<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      message: "Hi! Ask anything about this report.",
      sender: "Assistant",
      direction: "incoming",
      role: "assistant",
    },
    {
      id: 2,
      message: "I use DeepSeek to answer your questions.",
      sender: "System",
      direction: "incoming",
      role: "system",
    },
  ])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

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

  async function handleSend(rawText?: string) {
    const text = rawText ?? input
    const content = text.trim()
    if (!content || isSending) return

    // Cancel any ongoing generation
    if (abortController) {
      abortController.abort()
    }

    const controller = new AbortController()
    setAbortController(controller)

    const userMessage: ChatMessage = {
      id: Date.now(),
      message: content,
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

    // Show user + empty assistant message to stream into
    setMessages([...history, assistantMessage])
    setInput("")

    if (messageListRef.current) {
      lockedScrollTopRef.current = messageListRef.current.scrollTop
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/chat/deepseek", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history
            .filter(item => item.role !== "system")
            .map(item => ({
              role: item.role === "user" ? "user" : ("assistant" as const),
              content: item.message,
            })),
          stream: true,
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

        setMessages(prev =>
          prev.map(message =>
            message.id === assistantMessage.id
              ? { ...message, message: message.message + chunk }
              : message
          )
        )
      }

      // If the assistant message stayed empty, show a fallback
      setMessages(prev =>
        prev.map(message =>
          message.id === assistantMessage.id && !message.message.trim()
            ? {
                ...message,
                message: "Sorry, DeepSeek did not return any content.",
              }
            : message
        )
      )
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setMessages(prev =>
          prev.map(message =>
            message.id === assistantMessage.id && !message.message.trim()
              ? {
                  ...message,
                  message: "Generation stopped.",
                }
              : message
          )
        )
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 2,
            message:
              "There was a problem talking to DeepSeek. Please try again later.",
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
  }

  function handleStop() {
    if (!abortController) return
    abortController.abort()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  useEffect(() => {
    if (!isSending) return
    const container = messageListRef.current
    if (!container) return
    if (lockedScrollTopRef.current === null) return

    container.scrollTop = lockedScrollTopRef.current
  }, [messages, isSending])

  return (
    <div className="bg-background absolute right-0 bottom-14 w-[min(100vw-2.5rem,22rem)] overflow-hidden rounded-lg border shadow-lg sm:bottom-16">
      <header className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <div className="text-xs font-semibold sm:text-sm">AI Assistant</div>
          <div className="text-muted-foreground text-[10px] sm:text-[11px]">
            Ask anything about this report.
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted rounded px-1 text-xs"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      <div className="h-80 text-xs sm:text-[11px]">
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
                  className={`max-w-[80%] rounded-md border px-2 py-1 text-[11px] leading-relaxed sm:text-xs ${
                    message.direction === "outgoing"
                      ? "bg-primary text-primary-foreground border-primary/60"
                      : "bg-muted/60 text-foreground border-border"
                  }`}
                >
                  {message.message}
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
              回到最新訊息
            </button>
          )}

          <div className="border-t px-2 py-2">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                className="bg-background focus-visible:ring-ring max-h-24 flex-1 resize-none rounded border px-2 py-1 text-xs outline-none focus-visible:ring-1 sm:text-[11px]"
                placeholder="Type a message..."
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending && !abortController}
              />

              {isSending && abortController ? (
                <Button
                  variant="outline"
                  className="h-7 rounded px-3 text-xs"
                  onClick={handleStop}
                >
                  Stop
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="h-7 rounded px-3 text-xs disabled:opacity-20"
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isSending}
                >
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
