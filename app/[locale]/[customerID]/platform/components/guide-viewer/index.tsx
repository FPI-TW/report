"use client"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import { useEffect, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import useZoom from "../pdf-viewer/hooks/useZoom"

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs"
}

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
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfHeight, setPdfHeight] = useState(0)
  const { zoom, appliedZoom, minZoom, maxZoom, zoomStep, handleZoomChange } =
    useZoom()

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!pdfContainerRef.current) return
    const container = pdfContainerRef.current

    const updateHeight = () => {
      setPdfHeight(container.clientHeight * 0.95)
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [url])

  useEffect(() => {
    if (!pdfContainerRef.current || !numPages) return

    const observer = new IntersectionObserver(
      entries => {
        const visibleEntry = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        const pageNumber = Number(
          visibleEntry?.target.getAttribute("data-page-number")
        )

        if (Number.isFinite(pageNumber)) {
          setCurrentPage(pageNumber)
        }
      },
      {
        root: pdfContainerRef.current,
        threshold: [0.4, 0.6, 0.8, 1],
      }
    )

    pageRefs.current.slice(0, numPages).forEach(node => {
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [numPages])

  useEffect(() => {
    if (numPages && numPages > 0) {
      setCurrentPage(1)
    }
  }, [numPages])

  const handleLoadSuccess = ({
    numPages: loadedNumPages,
  }: {
    numPages: number
  }) => {
    setNumPages(loadedNumPages ?? 0)
  }

  const pageHeight = pdfHeight > 0 ? pdfHeight * appliedZoom : 0

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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded"
              onClick={() => handleZoomChange(-zoomStep)}
              disabled={zoom <= minZoom}
              aria-label={t("zoom_out")}
            >
              -
            </Button>
            <p className="text-muted-foreground w-14 text-center text-sm font-semibold">
              {Math.round(zoom * 100)}%
            </p>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded"
              onClick={() => handleZoomChange(zoomStep)}
              disabled={zoom >= maxZoom}
              aria-label={t("zoom_in")}
            >
              +
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 rounded px-3"
          >
            {t("close")}
          </Button>
        </div>
      </header>

      <div ref={pdfContainerRef} className="bg-muted/40 flex-1 overflow-auto">
        {!url ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            {t("missing_file")}
          </div>
        ) : pageHeight <= 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            {t("loading_pdf")}
          </div>
        ) : (
          <div className="flex w-full justify-center px-4 py-4">
            <Document
              file={url}
              error={<div className="text-destructive">{t("load_error")}</div>}
              onLoadSuccess={handleLoadSuccess}
            >
              <div className="flex w-full flex-col items-center gap-6">
                {numPages &&
                  Array.from({ length: numPages }, (_, index) => (
                    <GuidePage
                      key={`page-${index + 1}`}
                      pageNumber={index + 1}
                      height={pageHeight}
                      registerPageRef={node => {
                        pageRefs.current[index] = node
                      }}
                    />
                  ))}
              </div>
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}

function GuidePage({
  pageNumber,
  height,
  registerPageRef,
}: {
  pageNumber: number
  height: number
  registerPageRef?: (node: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={node => {
        registerPageRef?.(node)
      }}
      data-page-number={pageNumber}
      className="flex w-full justify-center"
      style={{ minHeight: height }}
    >
      <div className="relative inline-block">
        <Page pageNumber={pageNumber} height={height} />
      </div>
    </div>
  )
}
