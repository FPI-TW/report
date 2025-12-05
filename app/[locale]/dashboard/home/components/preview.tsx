"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import {
  BRAND,
  PREVIEW_MONTHS,
  REPORT_CATEGORIES,
  type ReportCategory,
} from "./constants"

type PreviewItem = { key: string; date: string; url: string }
type PreviewGroup = { year: number; month: number; items: PreviewItem[] }
type PreviewResponse = {
  page: number
  months: number
  hasPrev: boolean
  hasNext: boolean
  groups: PreviewGroup[]
  totalGroups: number
}

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

async function fetchReports(
  category: ReportCategory,
  page: number,
  months: number
): Promise<PreviewResponse> {
  const res = await fetch(`/api/${category}?page=${page}&months=${months}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("list_failed")
  }
  return res.json()
}

type PreviewSectionProps = {
  isActive: boolean
  category: ReportCategory
  page: number
  onCategoryChange: (category: ReportCategory) => void
  onPageChange: (page: number) => void
}

export default function PreviewSection({
  isActive,
  category,
  page,
  onCategoryChange,
  onPageChange,
}: PreviewSectionProps) {
  const tHome = useTranslations("dashboard_home")
  const tDash = useTranslations("dashboard")

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    isFetching: isPreviewFetching,
    refetch: refetchPreview,
  } = useQuery<PreviewResponse>({
    queryKey: ["dashboard-preview", category, page],
    queryFn: () => fetchReports(category, page, PREVIEW_MONTHS),
    enabled: isActive,
  })

  return (
    <div className="space-y-6">
      <div className="relative space-y-2">
        <h2 className="text-2xl font-semibold" style={{ color: BRAND }}>
          {tHome("preview_title")}
        </h2>
        <p className="text-sm text-gray-700">{tHome("preview_description")}</p>
        <div className="mt-2" style={{ borderBottom: `2px solid ${BRAND}` }} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-800">
            {tHome("preview_category_label")}
          </label>
          <select
            className="rounded border px-3 py-2 text-sm"
            value={category}
            onChange={e => {
              const nextCategory = REPORT_CATEGORIES.find(
                cat => cat === e.target.value
              )
              if (nextCategory) {
                onCategoryChange(nextCategory)
                onPageChange(1)
              }
            }}
          >
            <option value="daily-report">{tDash("daily_title")}</option>
            <option value="weekly-report">{tDash("weekly_title")}</option>
            <option value="research-report">{tDash("research_title")}</option>
            <option value="ai-news">{tDash("ai_news_title")}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
            disabled={
              isPreviewLoading ||
              isPreviewFetching ||
              !previewData?.hasPrev ||
              page === 1
            }
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            {tDash("prev_page")}
          </button>
          <span className="text-xs text-gray-700">{page}</span>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
            disabled={
              isPreviewLoading || isPreviewFetching || !previewData?.hasNext
            }
            onClick={() => onPageChange(page + 1)}
          >
            {tDash("next_page")}
          </button>
        </div>

        <button
          type="button"
          onClick={() => refetchPreview()}
          disabled={isPreviewFetching}
          className="rounded border border-[#ddae58] px-3 py-1 text-sm font-medium text-[#ddae58] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPreviewFetching
            ? tHome("preview_loading")
            : tHome("preview_refresh")}
        </button>
      </div>

      <div className="space-y-4">
        {isPreviewLoading && (
          <p className="text-sm text-gray-700">{tHome("preview_loading")}</p>
        )}
        {isPreviewError && (
          <p className="text-sm text-red-600">{tHome("preview_error")}</p>
        )}
        {previewData &&
          previewData.groups.length === 0 &&
          !isPreviewLoading &&
          !isPreviewError && (
            <p className="text-sm text-gray-700">{tHome("preview_empty")}</p>
          )}

        {previewData &&
          previewData.groups.map(group => (
            <section
              key={`${group.year}-${group.month}`}
              className="space-y-3 rounded-lg border bg-white/70 p-4 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">
                  {group.year} {monthLabel(group.month)}
                </div>
                <div className="text-xs text-gray-600">
                  {group.items.length} file{group.items.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="space-y-2">
                {group.items.map(item => {
                  const fileName = decodeURIComponent(
                    item.key.split("/").pop() || item.key
                  )
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white/80 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-gray-800">
                          {fileName}
                        </p>
                        <p className="text-xs text-gray-600">{item.date}</p>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs font-medium text-blue-700 underline"
                      >
                        {tHome("preview_link_label")}
                      </a>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}
