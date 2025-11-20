"use client"

import { useEffect, useState } from "react"
import { create } from "zustand"

export default function useChat() {
  const dragConstraints = useDragConstraints()

  const chatWindow = useChatWindowStore()
  const chatHightlight = useHighlightStore()

  return {
    dragConstraints,
    chatWindow,
    chatHightlight,
  }
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

type ChatWindowState = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const useChatWindowStore = create<ChatWindowState>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set(state => ({ isOpen: !state.isOpen })),
}))

export type HighlightFeatureType = "ai-insights" | "deep-query"

type HighlightStoreState = {
  featureType: HighlightFeatureType | null
  text: string
  set: (payload: { text: string; feature: HighlightFeatureType }) => void
  clear: () => void
}

const useHighlightStore = create<HighlightStoreState>(set => ({
  featureType: null,
  text: "",
  set: ({ text, feature }) =>
    set({
      featureType: feature,
      text: text.trim(),
    }),
  clear: () =>
    set({
      featureType: null,
      text: "",
    }),
}))
