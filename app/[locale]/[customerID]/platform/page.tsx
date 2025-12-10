"use client"

import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { queryReportByType, type ReportType } from "./lib/query-report-by-type"
import { cn } from "@/lib/utils"
import useDialog from "@/hooks/useDialog"
import { updateParams } from "@/lib/updateParams"

import Tabs from "./components/tabs"
import SettingsDialog from "./components/settings-dialog"
import WarningAlert from "./components/warningAlert"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import { ensurePdfWorker } from "./lib/pdf-worker"

const PdfItem = dynamic(() => import("./components/pdf-item"), {
  ssr: false,
})
const GuideViewer = dynamic(() => import("./components/guide-viewer"), {
  ssr: false,
})

type ApiReport = { key: string; date: string; url: string }
type ApiGroup = { year: number; month: number; items: ApiReport[] }
type ApiResponse = {
  page: number
  months: number
  hasPrev: boolean
  hasNext: boolean
  groups: ApiGroup[]
}

const BRAND = "#ddae58" as const
const months = 3 as const

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

ensurePdfWorker()

export default function DashboardPage() {
  const search = useSearchParams()
  const defaultReportType =
    (search.get("reportType") as ReportType | null) || "daily-report"

  const [page, setPage] = useState(1)
  const [type, setType] = useState<ReportType>(defaultReportType)
  const t = useTranslations("dashboard")
  const settingsDialog = useDialog()
  const guideDialog = useDialog()
  const isLongName = type === "research-report" || type === "ai-news"
  const titleKeyMap: Record<ReportType, string> = {
    "daily-report": "daily_title",
    "weekly-report": "weekly_title",
    "research-report": "research_title",
    "ai-news": "ai_news_title",
  }
  const descKeyMap: Record<ReportType, string> = {
    "daily-report": "daily_description",
    "weekly-report": "weekly_description",
    "research-report": "research_description",
    "ai-news": "ai_news_description",
  }

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["reports", type, page, months],
    queryFn: () => queryReportByType(type, page, months),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const type = params.get("reportType")
    if (!type) updateParams({ reportType: "daily-report" })
  }, [])

  return (
    <div className="relative mx-auto flex h-screen max-w-7xl flex-col">
      {/* Scrollable content area */}
      <div className="relative grow overflow-y-auto p-8">
        <WarningAlert />

        {/* Preferences */}
        <SettingsDialog
          isOpen={settingsDialog.isOpen}
          onClose={settingsDialog.close}
        />

        {/* subtle brand-tinted background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1000px circle at 15% 0%, rgba(221, 174, 88, 0.12), transparent 70%), radial-gradient(900px circle at 85% 30%, rgba(221, 174, 88, 0.06), transparent 75%)",
          }}
        />

        {/* Top tabs above title */}
        <div className="relative mb-6 flex items-center justify-between">
          <Tabs
            value={type}
            onChange={v => {
              setType(v)
              setPage(1)
              updateParams({ reportType: v })
            }}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={settingsDialog.open}
            className="px-4"
          >
            {t("settings")}
          </Button>
        </div>

        <div className="relative mb-6 space-y-4">
          <h1 className="text-3xl font-semibold" style={{ color: BRAND }}>
            {t(titleKeyMap[type])}
          </h1>
          <p className="text-md text-gray-700">{t(descKeyMap[type])}</p>
          <div
            className="mt-3"
            style={{ borderBottom: `2px solid ${BRAND}` }}
          />
        </div>

        <div className="relative space-y-16">
          {isLoading && <p className="text-sm text-gray-700">{t("loading")}</p>}
          {isError && <p className="text-sm text-red-600">{t("error")}</p>}
          {data && data.groups.length === 0 && !isLoading && !isError && (
            <p className="text-sm text-gray-700">{t("empty")}</p>
          )}
          {data &&
            data.groups.map(group => (
              <section
                key={`${group.year}-${group.month}`}
                aria-labelledby={`year-${group.year}`}
                className="space-y-8"
              >
                <h2
                  id={`year-${group.year}`}
                  className="border-l-4 pl-3 text-xl font-semibold text-gray-800"
                  style={{ borderColor: BRAND }}
                >
                  {group.year} {monthLabel(group.month)}
                </h2>

                <div
                  className={cn(
                    "grid gap-x-4 gap-y-6",
                    "grid-cols-3 sm:grid-cols-5 lg:grid-cols-7"
                  )}
                >
                  {group.items.map(item => {
                    const fileName = decodeURIComponent(
                      item.key.split("/").pop() || item.key
                    )

                    return (
                      <PdfItem
                        key={item.key}
                        item={item}
                        name={isLongName ? fileName : item.date}
                        reportType={type}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
        </div>
      </div>

      {/* Footer (always visible) */}
      <footer className="sticky bottom-0 z-10 w-full border-t bg-white/80 px-8 py-3 backdrop-blur supports-backdrop-filter:bg-white/60">
        {data && (
          <div className="flex items-center justify-between">
            <button
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
              disabled={!data.hasPrev || page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              {t("prev_page")}
            </button>
            <span className="text-xs text-gray-700">{data.page}</span>
            <button
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
              disabled={!data.hasNext}
              onClick={() => setPage(p => p + 1)}
            >
              {t("next_page")}
            </button>
          </div>
        )}
      </footer>

      <GuideViewer
        isOpen={guideDialog.isOpen}
        url="https://pub-16077c4d9e2e4f2dba973968f81b8b18.r2.dev/guide/user-guide.pdf"
        title={t("user_guide_title")}
        onClose={guideDialog.close}
      />

      <Button
        className="fixed right-4 bottom-4 z-20 shadow-lg sm:right-6 sm:bottom-6"
        onClick={guideDialog.open}
      >
        <BookOpen className="size-4" />
        {t("user_guide")}
      </Button>
    </div>
  )
}
