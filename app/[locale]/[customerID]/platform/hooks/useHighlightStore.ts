"use client"

import { create } from "zustand"

export type HighlightFeatureType = "ai-insights" | "deep-query"

type HighlightStoreState = {
  featureType: HighlightFeatureType | null
  text: string
  setHighlight: (payload: {
    text: string
    feature: HighlightFeatureType
  }) => void
  clearHighlight: () => void
}

export const useHighlightStore = create<HighlightStoreState>(set => ({
  featureType: null,
  text: "",
  setHighlight: ({ text, feature }) =>
    set({
      featureType: feature,
      text: text.trim(),
    }),
  clearHighlight: () =>
    set({
      featureType: null,
      text: "",
    }),
}))
