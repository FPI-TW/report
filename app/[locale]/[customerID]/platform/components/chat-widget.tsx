"use client"

import { useEffect, useRef, useState } from "react"

type Position = {
  x: number
  y: number
}

export default function ChatWidget() {
  const [isDragging, setIsDragging] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 })
  const { position, setPosition } = useInitialPosition()

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return

      const nextX = event.clientX - dragOffsetRef.current.x
      const nextY = event.clientY - dragOffsetRef.current.y

      const maxX = window.innerWidth - 64
      const maxY = window.innerHeight - 64

      setPosition({
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.min(Math.max(0, nextY), maxY),
      })
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
      }
    }

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, setPosition])

  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    setIsDragging(true)
  }

  return (
    <div className="fixed z-40" style={{ left: position.x, top: position.y }}>
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
          onMouseDown={handleMouseDown}
          onClick={event => {
            event.stopPropagation()
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
    </div>
  )
}

function useInitialPosition() {
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 })
  useEffect(() => {
    if (typeof window === "undefined") return

    const margin = 24
    const size = 64

    setPosition({
      x: Math.max(margin, window.innerWidth - margin - size),
      y: Math.max(margin, window.innerHeight - margin - size),
    })
  }, [])

  return { position, setPosition }
}
