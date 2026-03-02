"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  BRAND,
  PREVIEW_MONTHS,
  REPORT_CATEGORIES,
  type ReportCategory,
} from "./constants"
import { ReportsApi } from "@/lib/api"
import { apiFetch, withAuthHeaders } from "@/lib/api/axios"
import useDialog from "@/hooks/useDialog"

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

type DeleteTarget = {
  item: PreviewItem
  displayName: string
}

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

async function fetchReports(
  category: ReportCategory,
  page: number,
  months: number,
  fileType: "pdf" | "audio"
): Promise<PreviewResponse> {
  const res = await apiFetch(
    `/${category}?page=${page}&months=${months}&fileType=${fileType}`,
    {
      headers: withAuthHeaders(),
    }
  )
  if (!res.ok) {
    throw new Error("list_failed")
  }
  return res.json()
}

type PreviewSectionProps = {
  isActive: boolean
  category: ReportCategory
  page: number
  fileType: "pdf" | "audio"
  onCategoryChange: (category: ReportCategory) => void
  onPageChange: (page: number) => void
}

export default function PreviewSection({
  isActive,
  category,
  page,
  fileType,
  onCategoryChange,
  onPageChange,
}: PreviewSectionProps) {
  const tHome = useTranslations("dashboard_home")
  const tDash = useTranslations("dashboard")
  const confirmDialog = useDialog()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    isFetching: isPreviewFetching,
    refetch: refetchPreview,
  } = useQuery<PreviewResponse>({
    queryKey: ["dashboard-preview", category, page, fileType],
    queryFn: () => fetchReports(category, page, PREVIEW_MONTHS, fileType),
    enabled: isActive,
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const { response, data } = await ReportsApi.deleteReport(key)
      if (!response.ok || !("ok" in data) || !data.ok) {
        throw new Error("delete_failed")
      }
      return data
    },
    onSuccess: () => {
      toast.success(tHome("preview_delete_success"))
      closeDialog()
      refetchPreview()
    },
    onError: () => {
      toast.error(tHome("preview_delete_error"))
    },
  })

  const askDelete = (item: PreviewItem, displayName: string) => {
    setDeleteTarget({ item, displayName })
    confirmDialog.open()
  }

  const closeDialog = () => {
    setDeleteTarget(null)
    confirmDialog.close()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.item.key)
  }

  return (
    <div className="space-y-6">
      <div className="relative space-y-2">
        <h2 className="text-2xl font-semibold" style={{ color: BRAND }}>
          {fileType === "audio"
            ? tHome("preview_audio_title")
            : tHome("preview_pdf_title")}
        </h2>
        <p className="text-sm text-gray-700">
          {fileType === "audio"
            ? tHome("preview_audio_description")
            : tHome("preview_pdf_description")}
        </p>
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
          className="min-w-20 rounded border border-[#ddae58] px-3 py-1 text-sm font-medium text-[#ddae58] disabled:cursor-not-allowed disabled:opacity-60"
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
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-red-700 underline disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => askDelete(item, fileName)}
                        disabled={deleteMutation.isPending}
                      >
                        {tHome("preview_delete")}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
      </div>

      {confirmDialog.isOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              {tHome("preview_confirm_title")}
            </h3>
            <p className="text-sm text-gray-700">
              {tHome("preview_confirm_message")}
            </p>
            <div className="rounded bg-gray-50 p-2 text-xs text-gray-800">
              <div className="font-semibold">{deleteTarget.displayName}</div>
              <div className="mt-1 font-mono text-[11px] break-all text-gray-700">
                {deleteTarget.item.key}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded border px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deleteMutation.isPending}
              >
                {tHome("preview_cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteMutation.isPending
                  ? tHome("preview_deleting")
                  : tHome("preview_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
