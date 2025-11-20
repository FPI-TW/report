"use client"

import { create } from "zustand"

type HighlightFeature = "ai-insights" | "deep-query"

type HighlightStoreState = {
  feature: HighlightFeature | null
  text: string
  setHighlight: (payload: { text: string; feature: HighlightFeature }) => void
  clearHighlight: () => void
}

export const useHighlightStore = create<HighlightStoreState>(set => ({
  feature: null,
  text: "",
  setHighlight: ({ text, feature }) =>
    set({
      feature,
      text: text.trim(),
    }),
  clearHighlight: () =>
    set({
      feature: null,
      text: "",
    }),
}))
