"use client"

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import PdfItem from "./components/pdf-item"
import { queryBriefs } from "./lib/query-briefs"

type ApiBrief = { key: string; date: string; url: string }
type ApiGroup = { year: number; month: number; items: ApiBrief[] }
type ApiResponse = {
  page: number
  months: number
  hasPrev: boolean
  hasNext: boolean
  groups: ApiGroup[]
}

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const BRAND = "#ddae58"
  const t = useTranslations("dashboard")
  const months = 6

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["briefs", page, months],
    queryFn: () => queryBriefs(page, months),
  })

  return (
    <div className="relative mx-auto max-w-7xl p-8">
      {/* subtle brand-tinted background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px circle at 15% 0%, rgba(221, 174, 88, 0.12), transparent 70%), radial-gradient(900px circle at 85% 30%, rgba(221, 174, 88, 0.06), transparent 75%)",
        }}
      />
      <header className="relative mb-6 space-y-4">
        <h1 className="text-3xl font-semibold" style={{ color: BRAND }}>
          {t("title")}
        </h1>
        <p className="text-md text-gray-700">{t("subtitle")}</p>
        <div className="mt-3" style={{ borderBottom: `2px solid ${BRAND}` }} />
      </header>

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

              <div className="grid gap-x-4 gap-y-6 sm:grid-cols-6 lg:grid-cols-8">
                {group.items.map(item => (
                  <PdfItem key={item.key} item={item} />
                ))}
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
