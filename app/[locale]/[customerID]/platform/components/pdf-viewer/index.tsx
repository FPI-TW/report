"use client"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Document, Page } from "react-pdf"
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
import type { ReportType } from "../../lib/query-report-by-type"
import { parsePdfTextFromUrl } from "../../lib/parse-pdf-text"
import useChat from "../../hooks/useChat"
import useZoom from "./hooks/useZoom"
import { AudioApi } from "@/lib/api"

type Props = {
  url: string
  title: string
  errorLabel: string
  reportType: ReportType
  reportDate: string
  fileName?: string | undefined
  onClose: () => void
}

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
  const [pdfText, setPdfText] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioReady, setAudioReady] = useState<boolean>(false)
  const [renderedPages, setRenderedPages] = useState(0)
  const { zoom, appliedZoom, minZoom, maxZoom, zoomStep, handleZoomChange } =
    useZoom()

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const { chatHightlight, chatWindow } = useChat()

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
  }, [numPages, pdfHeight])

  useEffect(() => {
    if (numPages && numPages > 0) {
      setCurrentPage(1)
    }
  }, [numPages])

  useEffect(() => {
    if (!numPages || numPages <= 0) {
      setRenderedPages(0)
      return
    }

    setRenderedPages(Math.min(10, numPages))

    const intervalId = window.setInterval(() => {
      setRenderedPages(prev => {
        if (prev >= numPages) {
          window.clearInterval(intervalId)
          return prev
        }
        const next = Math.min(prev + 10, numPages)
        if (next >= numPages) {
          window.clearInterval(intervalId)
        }
        return next
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [numPages, url])

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
    if (!loadedNumPages || loadedNumPages <= 0) {
      setPdfText("")
      return
    }

    const text = await parsePdfTextFromUrl(url)
    setPdfText(text)
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
    console.log(baseName)
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

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
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
        <div className="flex w-120 flex-col gap-0.5">
          <h2 className="truncate text-sm font-medium sm:text-base">{title}</h2>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] sm:text-xs">
            <span>{reportDate}</span>
            <span className="text-gray-400">·</span>
            <span>{t_dashboard(reportType)}</span>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {numPages ? (
            <span>
              Page {currentPage} / {numPages}
            </span>
          ) : null}
        </div>

        <div className="flex w-120 items-center justify-end gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-6 rounded"
              onClick={() => handleZoomChange(-zoomStep)}
              disabled={zoom <= minZoom}
              aria-label="Zoom out"
            >
              -
            </Button>
            <p className="text-muted-foreground px-2 text-center text-sm font-semibold">
              {Math.round(zoom * 100)}%
            </p>
            <Button
              variant="outline"
              size="icon"
              className="size-6 rounded"
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
            className="h-7 rounded px-2"
          >
            {t("close")}
          </Button>
        </div>
      </header>

      <div ref={pdfContainerRef} className="bg-muted/40 flex-1 overflow-auto">
        <PDFSuspense url={url} height={pageHeight}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex w-full justify-center px-4 py-4">
                <Document
                  file={url}
                  error={<div className="text-destructive">{errorLabel}</div>}
                  onLoadSuccess={handleLoadSuccess}
                >
                  <div className="flex w-full flex-col items-center gap-6">
                    {numPages &&
                      Array.from(
                        { length: Math.min(renderedPages, numPages) },
                        (_, index) => (
                          <PdfPage
                            key={`page-${index + 1}`}
                            pageNumber={index + 1}
                            height={pageHeight}
                            registerPageRef={node => {
                              pageRefs.current[index] = node
                            }}
                          />
                        )
                      )}
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
        <Page
          pageNumber={pageNumber}
          height={height}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </div>
    </div>
  )
}

function PDFSuspense({
  url,
  height,
  children,
}: {
  url: string
  height: number
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

  if (height <= 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {t("loading_pdf")}
      </div>
    )
  }

  return <>{children}</>
}
