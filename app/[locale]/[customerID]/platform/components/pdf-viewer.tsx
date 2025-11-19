"use client"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import {
  useEffect,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import Chat from "./chat"

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs"
}

type Props = {
  url: string
  title: string
  errorLabel: string
  onClose: () => void
}

export default function PdfViewer({ url, title, errorLabel, onClose }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfHeight, setPdfHeight] = useState(0)
  const [pageInput, setPageInput] = useState("1")

  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const lastScrollTimeRef = useRef(0)

  useEffect(() => {
    if (pdfContainerRef.current) {
      setPdfHeight(pdfContainerRef.current.clientHeight * 0.95)
    }
  }, [url])

  useEffect(() => {
    if (numPages && numPages > 0) {
      setPageNumber(1)
      setPageInput("1")
    }
  }, [numPages])

  const setPageSafely = (nextPage: number) => {
    if (!numPages || numPages <= 0) return
    const clamped = Math.min(numPages, Math.max(1, nextPage))
    setPageNumber(clamped)
    setPageInput(String(clamped))
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!numPages || numPages <= 1) return

    const now = Date.now()
    if (now - lastScrollTimeRef.current < 400) return

    if (event.deltaY > 0 && pageNumber < numPages) {
      setPageSafely(pageNumber + 1)
      lastScrollTimeRef.current = now
    } else if (event.deltaY < 0 && pageNumber > 1) {
      setPageSafely(pageNumber - 1)
      lastScrollTimeRef.current = now
    }
  }

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <Chat />
        <div className="w-60">
          <h2 className="truncate text-sm font-medium sm:text-base">{title}</h2>
        </div>

        <div className="flex items-center gap-1">
          {numPages && numPages > 0 && (
            <div className="flex flex-1 items-center gap-1">
              <Button
                variant="outline"
                onClick={() => setPageSafely(pageNumber - 1)}
                disabled={pageNumber <= 1}
                className="h-7 rounded px-2"
              >
                ‹
              </Button>
              <div className="flex items-center gap-1">
                <input
                  min={1}
                  max={numPages}
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onBlur={() => {
                    const value = Number(pageInput)
                    if (!Number.isFinite(value)) {
                      setPageInput(String(pageNumber))
                      return
                    }
                    setPageSafely(value)
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                  className="h-7 w-14 rounded border px-1 text-center text-xs"
                />
                <span className="whitespace-nowrap">/ {numPages}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => setPageSafely(pageNumber + 1)}
                disabled={!numPages || pageNumber >= numPages}
                className="h-7 rounded px-2"
              >
                ›
              </Button>
            </div>
          )}
        </div>

        <div className="flex w-60 items-center justify-end gap-2 text-xs">
          {url && (
            <a
              href={url}
              download={title || "document.pdf"}
              rel="noopener noreferrer"
            >
              <Button variant="link" className="h-7 rounded">
                Download
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="h-7 rounded px-2"
          >
            Close
          </Button>
        </div>
      </header>

      <div ref={pdfContainerRef} className="bg-muted/40 flex-1 overflow-hidden">
        {url && pdfHeight > 0 ? (
          <div className="flex h-full w-full items-center justify-center py-4">
            <Document
              file={url}
              loading={
                <div className="text-muted-foreground text-xs">
                  Loading PDF…
                </div>
              }
              error={
                <div className="text-destructive text-xs">{errorLabel}</div>
              }
              onLoadSuccess={({ numPages: loadedNumPages }) => {
                setNumPages(loadedNumPages ?? 0)
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center px-4"
                onWheel={handleWheel}
              >
                <Page
                  pageNumber={pageNumber}
                  height={pdfHeight}
                  renderTextLayer
                  renderAnnotationLayer={false}
                />
              </div>
            </Document>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            No file to display.
          </div>
        )}
      </div>
    </>
  )
}
