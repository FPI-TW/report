"use client"

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import PdfItem from "./components/pdf-item"
import Tabs from "./components/tabs"
import { queryReportByType, type ReportType } from "./lib/query-report-by-type"
import WarningAlert from "./components/warningAlert"
import { cn } from "@/lib/utils"

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
const months = 6 as const

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<ReportType>("daily-report")
  const t = useTranslations("dashboard")
  const isLongName = type === "research-report" || type === "ai-news"

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["reports", type, page, months],
    queryFn: () => queryReportByType(type, page, months),
  })

  return (
    <div className="relative mx-auto max-w-7xl p-8">
      <WarningAlert />

      {/* subtle brand-tinted background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 min-h-screen"
        style={{
          background:
            "radial-gradient(1000px circle at 15% 0%, rgba(221, 174, 88, 0.12), transparent 70%), radial-gradient(900px circle at 85% 30%, rgba(221, 174, 88, 0.06), transparent 75%)",
        }}
      />
      {/* Top tabs above title */}
      <div className="relative mb-6">
        <Tabs
          value={type}
          onChange={v => {
            setType(v)
            setPage(1)
          }}
        />
      </div>

      <div className="relative mb-6 space-y-4">
        <h1 className="text-3xl font-semibold" style={{ color: BRAND }}>
          {t("title")}
        </h1>
        <p className="text-md text-gray-700">{t("subtitle")}</p>
        <div className="mt-3" style={{ borderBottom: `2px solid ${BRAND}` }} />
      </div>

      <div className="relative space-y-12">
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
                    />
                  )
                })}
              </div>
            </section>
          ))}
      </div>

      {data && (
        <div className="mt-12 flex items-center justify-between">
          <button
            className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
            disabled={!data.hasPrev || page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            {t("prev_page")}
          </button>
          {/* <span className="text-xs text-gray-700">{data.page}</span> */}
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
    </div>
  )
}
