"use client"

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
          <div className="bg-background absolute right-0 bottom-16 w-80 rounded-lg border shadow-lg">
            <header className="flex items-center justify-between border-b px-3 py-2">
              <div className="text-sm font-medium">AI Assistant</div>
              <button
                type="button"
                className="text-muted-foreground hover:bg-muted rounded px-1 text-xs"
                onClick={event => {
                  event.stopPropagation()
                  setIsOpen(false)
                }}
              >
                ✕
              </button>
            </header>
            <div className="text-muted-foreground flex max-h-80 flex-col px-3 py-2 text-xs">
              <div className="mb-2 text-[11px]">
                Chat with an AI assistant about this report. (API not connected
                yet.)
              </div>
              <div className="bg-muted/40 flex-1 rounded border p-2">
                <div className="text-muted-foreground text-[11px]">
                  Messages will appear here.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t px-3 py-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="h-7 flex-1 rounded border px-2 text-xs"
                disabled
              />
              <button
                type="button"
                className="bg-primary text-primary-foreground h-7 rounded px-2 text-xs opacity-60"
                disabled
              >
                Send
              </button>
            </div>
          </div>
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
