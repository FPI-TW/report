"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useDragControls } from "motion/react"
import { useTranslations } from "next-intl"
import type { ReportType } from "@/types/reports"
import { Headphones } from "lucide-react"

type Props = {
  reportType: ReportType
  reportDate: string
  fileName?: string | undefined
  audioUrl: string | null
}

export default function AudioFeatureBar({
  reportType,
  reportDate,
  fileName,
  audioUrl,
}: Props) {
  const t = useTranslations("audio_bar")
  const tDashboard = useTranslations("dashboard")
  const [isOpen, setIsOpen] = useState(false)
  const dragControls = useDragControls()
  const dragConstraints = useAudioDragConstraints()
  const hasDraggedRef = useRef(false)
  const derivedFileName = useMemo(() => {
    const fromProp = fileName?.split("/").pop()
    if (fromProp && fromProp.trim()) {
      return fromProp.replace(/\.[^.]+$/i, "").trim()
    }

    if (reportDate?.trim()) {
      return reportDate.trim()
    }

    return null
  }, [fileName, reportDate])

  if (!audioUrl) {
    return null
  }

  return (
    <motion.div
      className="fixed right-4 bottom-20 z-40 sm:right-12 sm:bottom-24 sm:left-auto"
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={dragConstraints}
      dragElastic={0}
      dragMomentum={false}
      onDrag={() => {
        hasDraggedRef.current = true
      }}
    >
      <div className="relative flex flex-col items-start gap-2">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full bg-linear-to-r from-orange-500 via-amber-500 to-yellow-400 shadow-md transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:size-12"
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
            setIsOpen(open => {
              const next = !open
              return next
            })
          }}
        >
          <span className="sr-only">{t("open_audio_dashboard")}</span>
          <Headphones className="size-6 sm:size-6" color="#ffffff" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="bg-background/95 absolute right-0 bottom-[calc(100%+12px)] w-[min(90vw,26rem)] rounded-xl border shadow-2xl backdrop-blur"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
            >
              <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold tracking-[0.18em] text-orange-600 uppercase">
                    {t("feature_bar_title")}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("feature_bar_subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground rounded p-1 text-xs"
                  onClick={() => setIsOpen(false)}
                  aria-label={t("close_audio_dashboard")}
                >
                  ✕
                </button>
              </header>

              <div className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-orange-100 px-2 py-1 font-semibold text-orange-700">
                    {tDashboard(reportType)}
                  </span>
                  <span className="text-muted-foreground">{reportDate}</span>
                </div>

                <div className="bg-muted/40 rounded-lg border px-3 py-3">
                  {audioUrl && (
                    <div className="space-y-2">
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>{derivedFileName}</span>
                        <span className="font-semibold text-orange-600">
                          {t("audio_ready")}
                        </span>
                      </div>
                      <audio
                        className="w-full"
                        preload="none"
                        src={audioUrl}
                        controls
                        controlsList="nodownload"
                      >
                        {t("audio_not_supported")}
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function useAudioDragConstraints() {
  const [constraints, setConstraints] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  })

  useEffect(() => {
    const margin = 12
    const size = 56

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
