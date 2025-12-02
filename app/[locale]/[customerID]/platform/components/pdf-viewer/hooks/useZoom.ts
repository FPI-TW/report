import { useEffect, useState } from "react"

type UseZoomOptions = {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  delayMs?: number
}

export default function useZoom({
  minZoom = 0.8,
  maxZoom = 1.5,
  zoomStep = 0.1,
  delayMs = 500,
}: UseZoomOptions = {}) {
  const [zoom, setZoom] = useState(1)
  const [appliedZoom, setAppliedZoom] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setAppliedZoom(zoom), delayMs)
    return () => clearTimeout(timer)
  }, [zoom, delayMs])

  const handleZoomChange = (delta: number) => {
    setZoom(current =>
      clamp(Number((current + delta).toFixed(2)), minZoom, maxZoom)
    )
  }

  return {
    zoom,
    appliedZoom,
    minZoom,
    maxZoom,
    zoomStep,
    handleZoomChange,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
