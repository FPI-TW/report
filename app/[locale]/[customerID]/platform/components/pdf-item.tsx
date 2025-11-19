"use client"

import { useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "motion/react"
import useDialog from "@/hooks/useDialog"
import PdfViewer from "./pdf-viewer"
import type { ReportType } from "../lib/query-report-by-type"
import { ReportsApi } from "@/lib/api"

export type PdfSource = { key: string; date: string; url: string }

type Props = {
  item: PdfSource
  name?: string | undefined
  reportType: ReportType
}

export default function PdfItem({ item, name, reportType }: Props) {
  const t = useTranslations("dashboard")
  const displayName = name ?? item.date
  const pdfModal = useDialog()
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const { response, data } = await ReportsApi.fetchReportUrl(item.key)
      if (!response.ok || !("url" in data)) {
        throw new Error("sign_failed")
      }
      setViewerUrl(data.url)
      pdfModal.open()
    } catch {
      toast.error(t("error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <article
        className="flex cursor-pointer flex-col items-center justify-between space-y-1.5 transition-all hover:-translate-y-0.5"
        onClick={handleClick}
      >
        <Image
          src="/icon/pdf.svg"
          alt="PDF"
          width={75}
          height={92}
          className="opacity-80"
          style={{
            height: "auto",
            width: "64px",
          }}
        />
        <h4 className="text-center text-base font-medium break-all whitespace-normal text-gray-900 sm:text-lg">
          {displayName}
        </h4>
      </article>

      <AnimatePresence>
        {pdfModal.isOpen && (
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
                {viewerUrl ? (
                  <PdfViewer
                    url={viewerUrl}
                    title={displayName}
                    errorLabel={t("error")}
                    reportType={reportType}
                    reportDate={item.date}
                    onClose={pdfModal.close}
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
                    {isLoading ? "Loading…" : "No file to display."}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
