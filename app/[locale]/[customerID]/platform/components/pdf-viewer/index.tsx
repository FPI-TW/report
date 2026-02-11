"use client"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, type PageProps } from "react-pdf"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import AudioFeatureBar from "../audio-feature-bar"
import Chat from "../chat"
import type { ReportType } from "@/types/reports"
import { parsePdfTextFromUrl } from "../../lib/parse-pdf-text"
import useChat from "../../hooks/useChat"
import useZoom from "./hooks/useZoom"
import { AudioApi } from "@/lib/api"
import {
  type PageRange,
  isPageInRanges,
  isRangeCovered,
  mergeRanges,
  normalizeInitialPages,
} from "./lib/page-rendering"

type Props = {
  url: string
  title: string
  errorLabel: string
  reportType: ReportType
  reportDate: string
  fileName?: string | undefined
  onClose: () => void
}

type PageLoadSuccess = NonNullable<PageProps["onLoadSuccess"]>

const initialPages = [0, 1, 2, 3, 4, 5, 18, 28, 36, 59, 68, 73, 90]

export default function PdfViewer({
  url,
  title,
  errorLabel,
  reportType,
  reportDate,
  fileName,
  onClose,
}: Props) {
  const t = useTranslations("pdf_viewer")
  const t_dashboard = useTranslations("dashboard")
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfHeight, setPdfHeight] = useState(0)
  const [pdfWidth, setPdfWidth] = useState(0)
  const [pageRatio, setPageRatio] = useState<number | null>(null)
  const [pdfText, setPdfText] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioReady, setAudioReady] = useState<boolean>(false)
  const [renderedRanges, setRenderedRanges] = useState<PageRange[]>([])
  const { zoom, appliedZoom, minZoom, maxZoom, zoomStep, handleZoomChange } =
    useZoom()

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const { chatHightlight, chatWindow } = useChat()
  const initialPageAnchors = useMemo(
    () => normalizeInitialPages(initialPages, numPages),
    [numPages]
  )
  const initialPageSet = useMemo(
    () => new Set(initialPageAnchors),
    [initialPageAnchors]
  )

  useEffect(() => {
    if (!pdfContainerRef.current) return
    const container = pdfContainerRef.current

    function updateSize() {
      setPdfHeight(container.clientHeight * 0.95)
      setPdfWidth(container.clientWidth)
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
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
  }, [numPages, pdfHeight, pdfWidth])

  useEffect(() => {
    if (numPages && numPages > 0) {
      setCurrentPage(1)
    }
  }, [numPages])

  useEffect(() => {
    if (!numPages || numPages <= 0) return
    if (!Number.isFinite(currentPage) || currentPage <= 0) return

    const nextAnchor = initialPageAnchors.find(page => page > currentPage)
    const rangeEnd = nextAnchor ? Math.min(nextAnchor - 1, numPages) : numPages

    if (rangeEnd < currentPage) return

    const nextRange = { start: currentPage, end: rangeEnd }

    setRenderedRanges(prev => {
      if (isRangeCovered(prev, nextRange)) return prev
      return mergeRanges(prev, nextRange)
    })
  }, [currentPage, initialPageAnchors, numPages])

  const handleAiInsights = () => {
    if (typeof window === "undefined") return

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() ?? ""

    if (!selectedText) {
      toast(t("select_text"))
      return
    }

    chatHightlight.set({
      text: selectedText,
      feature: "ai-insights",
    })
    chatWindow.open()
  }

  const handleDeepQuery = () => {
    if (typeof window === "undefined") return

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() ?? ""

    if (!selectedText) {
      toast(t("select_text"))
      return
    }

    chatHightlight.set({
      text: selectedText,
      feature: "deep-query",
    })
    chatWindow.open()
  }

  async function handleLoadSuccess({
    numPages: loadedNumPages,
  }: {
    numPages: number
  }) {
    setNumPages(loadedNumPages ?? 0)
    setPageRatio(null)
    if (!loadedNumPages || loadedNumPages <= 0) {
      setPdfText("")
      return
    }

    const text = await parsePdfTextFromUrl(url)
    setPdfText(text)
  }

  const handlePageLoadSuccess: PageLoadSuccess = page => {
    if (pageRatio) return
    const viewport = page.getViewport({ scale: 1 })
    if (viewport.width <= 0 || viewport.height <= 0) return
    setPageRatio(viewport.height / viewport.width)
  }

  useEffect(() => {
    const baseName =
      (fileName ?? reportDate ?? "")
        .split("/")
        .pop()
        ?.replace(/\.[^.]+$/i, "")
        ?.trim()
        ?.replace(/[\\/]/g, "-") || ""

    if (!baseName) {
      setAudioUrl(null)
      setAudioReady(false)
      return
    }

    const key = `${reportType}/audio/${baseName}.mp3`
    let cancelled = false
    const fetchAudio = async () => {
      const { response, data } = await AudioApi.fetchAudioUrl(key)
      if (cancelled) return
      if (response.ok && "url" in data) {
        setAudioUrl(data.url)
        setAudioReady(true)
      } else {
        setAudioUrl(null)
        setAudioReady(false)
      }
    }

    void fetchAudio()

    return () => {
      cancelled = true
    }
  }, [fileName, reportDate, reportType])

  const pageHeight = pdfHeight > 0 ? pdfHeight * appliedZoom : 0
  const pageWidth = pdfWidth > 0 ? pdfWidth * appliedZoom : 0
  const isMobile = pdfWidth > 0 && pdfWidth < 640
  const isReady = isMobile ? pageWidth > 0 : pageHeight > 0
  const pageMinHeight = useMemo(() => {
    if (isMobile) {
      return pageRatio ? pageWidth * pageRatio : 300
    }

    return pageHeight
  }, [isMobile, pageHeight, pageWidth, pageRatio])

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:gap-4">
        {/* Fixed Chat */}
        <Chat
          reportType={reportType}
          reportDate={reportDate}
          pdfText={pdfText}
        />
        <AudioFeatureBar
          reportType={reportType}
          reportDate={reportDate}
          fileName={fileName}
          audioUrl={audioReady ? audioUrl : null}
        />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-sm font-medium sm:text-base">{title}</h2>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] sm:text-xs">
            <span>{reportDate}</span>
            <span className="text-gray-400">·</span>
            <span>{t_dashboard(reportType)}</span>
          </div>
        </div>

        <div className="text-muted-foreground hidden items-center gap-2 text-xs sm:flex">
          {numPages ? (
            <span>
              Page {currentPage} / {numPages}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 text-xs sm:gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded sm:size-8"
              onClick={() => handleZoomChange(-zoomStep)}
              disabled={zoom <= minZoom}
              aria-label="Zoom out"
            >
              -
            </Button>
            <p className="text-muted-foreground hidden px-2 text-center text-sm font-semibold sm:block">
              {Math.round(zoom * 100)}%
            </p>
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded sm:size-8"
              onClick={() => handleZoomChange(zoomStep)}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
            >
              +
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onClose()
              chatWindow.close()
              chatHightlight.clear()
            }}
            className="h-8 rounded px-3 sm:h-9"
          >
            {t("close")}
          </Button>
        </div>
      </header>

      <div ref={pdfContainerRef} className="bg-muted/40 flex-1 overflow-auto">
        <PDFSuspense url={url} isReady={isReady}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex w-full justify-center px-0 py-4 sm:px-4">
                <Document
                  file={url}
                  error={<div className="text-destructive">{errorLabel}</div>}
                  onLoadSuccess={handleLoadSuccess}
                >
                  <div className="flex w-full flex-col items-center gap-6">
                    {numPages &&
                      Array.from({ length: numPages }, (_, index) => {
                        const pageNumber = index + 1
                        const shouldRender =
                          initialPageSet.has(pageNumber) ||
                          isPageInRanges(pageNumber, renderedRanges)

                        if (!shouldRender) return null
                        const pageSizeProps = isMobile
                          ? { width: pageWidth }
                          : { height: pageHeight }

                        return (
                          <PdfPage
                            key={`page-${pageNumber}`}
                            pageNumber={pageNumber}
                            minHeight={pageMinHeight}
                            onLoadSuccess={handlePageLoadSuccess}
                            registerPageRef={node => {
                              pageRefs.current[index] = node
                            }}
                            {...pageSizeProps}
                          />
                        )
                      })}
                  </div>
                </Document>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuLabel className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t("context_title")}
              </ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={handleAiInsights}>
                {t("ai_insights")}
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleDeepQuery}>
                {t("deep_query")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </PDFSuspense>
      </div>
    </>
  )
}

function PdfPage({
  pageNumber,
  height,
  width,
  minHeight,
  onLoadSuccess = () => {},
  registerPageRef,
}: {
  pageNumber: number
  height?: number
  width?: number
  minHeight?: number
  onLoadSuccess?: PageLoadSuccess
  registerPageRef?: (node: HTMLDivElement | null) => void
}) {
  const pageSizeProps = useMemo(() => {
    const isWidthValid = typeof width === "number" && width > 0
    const isHeightValid = typeof height === "number" && height > 0

    if (isWidthValid && isHeightValid) {
      return {
        width,
        height,
      }
    }

    if (isWidthValid) {
      return { width }
    }
    if (isHeightValid) {
      return { height }
    }
  }, [width, height])

  return (
    <div
      ref={node => {
        registerPageRef?.(node)
      }}
      data-page-number={pageNumber}
      className="flex w-full justify-center"
      style={{ minHeight }}
    >
      <div className="relative inline-block">
        <Page
          pageNumber={pageNumber}
          renderTextLayer
          renderAnnotationLayer
          onLoadSuccess={onLoadSuccess}
          {...pageSizeProps}
        />
      </div>
    </div>
  )
}

function PDFSuspense({
  url,
  isReady,
  children,
}: {
  url: string
  isReady: boolean
  children: React.ReactNode
}) {
  const t = useTranslations("pdf_viewer")

  if (!url) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {t("no_file")}
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {t("loading_pdf")}
      </div>
    )
  }

  return <>{children}</>
}
