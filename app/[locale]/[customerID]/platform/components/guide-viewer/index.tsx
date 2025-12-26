"use client"

import { useEffect, useState } from "react"
import { pdfjs } from "react-pdf"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"

type Props = {
  isOpen: boolean
  url: string
  title: string
  onClose: () => void
}

export default function UserGuideViewer({
  isOpen,
  url,
  title,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative flex h-full w-full items-end">
            <motion.div
              className="bg-background flex h-full w-full flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <GuideViewerContent url={url} title={title} onClose={onClose} />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function GuideViewerContent({
  url,
  title,
  onClose,
}: {
  url: string
  title: string
  onClose: () => void
}) {
  const t = useTranslations("guide_viewer")
  const [numPages, setNumPages] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const currentPage = 1

  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      if (!url) {
        setNumPages(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const pdf = await pdfjs.getDocument(url).promise
        if (!cancelled) {
          setNumPages(pdf.numPages > 0 ? pdf.numPages : null)
        }
      } catch (error) {
        console.warn("Failed to load PDF metadata", error)
        if (!cancelled) {
          setNumPages(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            {t("title")}
          </p>
          <h2 className="truncate text-base font-semibold text-gray-900">
            {title}
          </h2>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {numPages ? (
            <span>
              {t("page_counter", { current: currentPage, total: numPages })}
            </span>
          ) : (
            <span>{t("preparing_pages")}</span>
          )}
        </div>

        <Button
          variant="outline"
          onClick={onClose}
          className="h-9 rounded px-3"
        >
          {t("close")}
        </Button>
      </header>

      <div className="bg-muted/40 flex-1 overflow-hidden">
        {!url ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            {t("missing_file")}
          </div>
        ) : isLoading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            {t("loading_pdf")}
          </div>
        ) : (
          <iframe title={title} src={url} className="h-full w-full border-0" />
        )}
      </div>
    </div>
  )
}
