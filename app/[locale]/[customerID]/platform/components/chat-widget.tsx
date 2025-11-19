"use client"

import {
  ChatContainer,
  MainContainer,
  Message,
  MessageInput,
  MessageList,
} from "@chatscope/chat-ui-kit-react"
import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const hasDraggedRef = useRef(false)
  const constraints = useDragConstraints()

  return (
    <motion.div
      className="fixed right-6 bottom-6 z-40"
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
          className="bg-background hover:bg-muted flex h-12 w-12 cursor-move items-center justify-center rounded-full border shadow-lg"
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
            className="text-foreground h-6 w-6"
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
  onClose: (event: React.MouseEvent<HTMLButtonElement>) => void
}

function ChatWindow({ onClose }: ChatWindowProps) {
  const [messages] = useState([
    {
      id: 1,
      message: "Hi! Ask anything about this report.",
      sender: "Assistant",
      direction: "incoming" as const,
    },
    {
      id: 2,
      message: "Chat API is not connected yet.",
      sender: "System",
      direction: "incoming" as const,
    },
  ])

  return (
    <div className="bg-background absolute right-0 bottom-16 w-80 overflow-hidden rounded-lg border shadow-lg">
      <header className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-medium">AI Assistant</div>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted rounded px-1 text-xs"
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="h-80 text-xs">
        <MainContainer
          style={{
            height: "100%",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          <ChatContainer>
            <MessageList
              style={{
                padding: "0.5rem",
              }}
            >
              {messages.map(item => (
                <Message
                  key={item.id}
                  model={{
                    message: item.message,
                    position: "single",
                    sender: item.sender,
                    direction: item.direction,
                  }}
                />
              ))}
            </MessageList>
            <MessageInput
              placeholder="Type a message... (coming soon)"
              // disabled
            />
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  )
}
