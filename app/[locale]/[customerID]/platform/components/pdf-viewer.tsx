"use client"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import { useEffect, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
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
import Chat from "./chat"
import type { ReportType } from "../lib/query-report-by-type"
import { parsePdfTextFromUrl } from "../lib/parse-pdf-text"
import useChat from "../hooks/useChat"

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs"
}

type Props = {
  url: string
  title: string
  errorLabel: string
  reportType: ReportType
  reportDate: string
  onClose: () => void
}

export default function PdfViewer({
  url,
  title,
  errorLabel,
  reportType,
  reportDate,
  onClose,
}: Props) {
  const t = useTranslations("pdf_viewer")
  const t_dashboard = useTranslations("dashboard")
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pdfHeight, setPdfHeight] = useState(0)

  const [pdfText, setPdfText] = useState("")

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)

  const { chatHightlight, chatWindow } = useChat()

  console.log(pdfHeight)

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

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        {/* Fixed Chat */}
        <Chat
          reportType={reportType}
          reportDate={reportDate}
          pdfText={pdfText}
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
          {numPages ? <span>{numPages} pages</span> : null}
        </div>

        <div className="flex w-120 items-center justify-end gap-2 text-xs">
          {url && (
            <a
              href={url}
              download={title || "document.pdf"}
              rel="noopener noreferrer"
            >
              <Button variant="link" className="h-7 rounded">
                {t("download")}
              </Button>
            </a>
          )}
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
        <PDFSuspense url={url} height={pdfHeight}>
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
                      Array.from({ length: numPages }, (_, index) => (
                        <Page
                          key={`page-${index + 1}`}
                          pageNumber={index + 1}
                          height={pdfHeight}
                          renderTextLayer
                          renderAnnotationLayer
                        />
                      ))}
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
