"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import AudioFeatureBar from "../audio-feature-bar"
import Chat from "../chat"
import type { ReportType } from "../../lib/query-report-by-type"
import { parsePdfTextFromUrl } from "../../lib/parse-pdf-text"
import useChat from "../../hooks/useChat"
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
  const [pdfText, setPdfText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioReady, setAudioReady] = useState<boolean>(false)
  const currentPage = 1

  const { chatHightlight, chatWindow } = useChat()

  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      if (!url) {
        setNumPages(null)
        setPdfText("")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const { text, numPages: totalPages } = await parsePdfTextFromUrl(url)
      if (cancelled) return
      setNumPages(totalPages > 0 ? totalPages : null)
      setPdfText(text)
      setIsLoading(false)
    }

    void loadPdf()

    return () => {
      cancelled = true
    }
  }, [url])

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

      <div className="bg-muted/40 flex-1 overflow-hidden">
        <PDFSuspense url={url} isLoading={isLoading} errorLabel={errorLabel}>
          <iframe title={title} src={url} className="h-full w-full border-0" />
        </PDFSuspense>
      </div>
    </>
  )
}

function PDFSuspense({
  url,
  isLoading,
  errorLabel,
  children,
}: {
  url: string
  isLoading: boolean
  errorLabel: string
  children: React.ReactNode
}) {
  const t = useTranslations("pdf_viewer")

  if (!url) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {errorLabel || t("no_file")}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {t("loading_pdf")}
      </div>
    )
  }

  return <div className="h-full w-full">{children}</div>
}
