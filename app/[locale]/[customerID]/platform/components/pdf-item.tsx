"use client"

import { useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "motion/react"
import useDialog from "@/hooks/useDialog"

export type PdfSource = { key: string; date: string; url: string }

type Props = {
  item: PdfSource
  name?: string | undefined
}

export default function PdfItem({ item, name }: Props) {
  const t = useTranslations("dashboard")
  const displayName = name ?? item.date
  const pdfModal = useDialog()
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/reports/url?key=${encodeURIComponent(item.key)}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error("sign_failed")
      const data: { url: string } = await res.json()
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
        style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
        onClick={handleClick}
      >
        <Image
          src="/icon/pdf.svg"
          alt="PDF"
          width={64}
          height={64}
          className="opacity-80"
        />
        <div className="h-full">
          <h4 className="text-center text-base font-medium break-all whitespace-normal text-gray-900 sm:text-lg">
            {displayName}
          </h4>
        </div>
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
                <header className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="text-sm font-medium sm:text-base">
                    {displayName}
                  </h2>
                  <button
                    type="button"
                    onClick={pdfModal.close}
                    className="bg-background text-foreground hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm"
                  >
                    <span>Close</span>
                  </button>
                </header>

                <div className="bg-muted/40 flex-1">
                  {viewerUrl ? (
                    <iframe
                      src={viewerUrl}
                      title={displayName}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                      {isLoading ? "Loading…" : "No file to display."}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
