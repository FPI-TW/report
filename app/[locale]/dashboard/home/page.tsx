"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { UploadApi } from "@/lib/api"

const REPORT_CATEGORIES = [
  "daily-report",
  "weekly-report",
  "research-report",
  "ai-news",
] as const
const PREVIEW_MONTHS = 1

type ReportCategory = (typeof REPORT_CATEGORIES)[number]

const schema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  file: z
    .instanceof(File)
    .refine(f => f && f.size > 0, "File is required")
    .refine(f => f.size <= 50 * 1024 * 1024, "File must be <= 50MB"),
  filename: z.string().optional(),
})

type FormValues = {
  category: ReportCategory
  file: File | null
  filename?: string
}

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

const BRAND = "#ddae58" as const

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

export default function UploadPage() {
  const t = useTranslations("dashboard_upload")
  const tDash = useTranslations("dashboard")
  const tHome = useTranslations("dashboard_home")
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { category: "daily-report", file: null, filename: "" },
    mode: "onBlur",
    criteriaMode: "all",
  })

  const [tab, setTab] = useState<"upload" | "preview">("upload")
  const [previewCategory, setPreviewCategory] =
    useState<ReportCategory>("daily-report")
  const [previewPage, setPreviewPage] = useState(1)
  const [result, setResult] = useState<{ key: string; url: string } | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const category = watch("category")
  const filename = watch("filename")
  const fileList = watch("file")

  const prefix = (() => {
    switch (category) {
      case "daily-report":
        return "daily-report/"
      case "weekly-report":
        return "weekly-report/"
      case "research-report":
        return "research-report/"
      case "ai-news":
        return "ai-news/"
    }
  })()

  const derivedName =
    filename && filename.trim().length > 0 ? filename : fileList?.name
  const derivedKey = derivedName ? `${prefix}${derivedName}` : ""

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    isFetching: isPreviewFetching,
    refetch: refetchPreview,
  } = useQuery<PreviewResponse>({
    queryKey: ["dashboard-preview", previewCategory, previewPage],
    queryFn: () => fetchReports(previewCategory, previewPage, PREVIEW_MONTHS),
    enabled: tab === "preview",
  })

  async function onSubmitRaw(data: FormValues) {
    // Validate with zod at runtime (file optional in RHF, required in schema)
    const parsed = schema.safeParse({
      category: data.category,
      filename: data.filename,
      file: data.file,
    })

    if (!parsed.success) return

    try {
      const file = parsed.data.file
      if (!file) return

      const { response: presignResp, data: presignBody } =
        await UploadApi.createUploadUrl({
          category: parsed.data.category,
          filename:
            parsed.data.filename && parsed.data.filename.trim().length > 0
              ? parsed.data.filename
              : file.name,
          contentType: file.type || "application/octet-stream",
        })

      if (!presignResp.ok || !presignBody?.ok || !presignBody.uploadUrl) {
        if ("message" in presignBody && presignBody.message) {
          throw new Error(presignBody.message)
        }

        if ("error" in presignBody && presignBody.error) {
          throw new Error(presignBody.error)
        }

        throw new Error("Upload failed")
      }

      const uploadResp = await fetch(presignBody.uploadUrl as string, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
      })

      if (!uploadResp.ok) {
        throw new Error("Upload failed")
      }

      setResult({ key: presignBody.key, url: presignBody.url })
      reset({ category: parsed.data.category, filename: "" })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      toast.success(t("toast_upload_success"))
    } catch {
      toast.error(t("toast_upload_error"))
    }
  }

  return (
    <div className="pb-3">
      <div className="mb-4 flex gap-3">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            tab === "upload"
              ? "bg-[#ddae58] text-white shadow"
              : "border border-[#ddae58] text-[#ddae58]"
          }`}
        >
          {tHome("tab_upload")}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("preview")
            setPreviewPage(1)
          }}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            tab === "preview"
              ? "bg-[#ddae58] text-white shadow"
              : "border border-[#ddae58] text-[#ddae58]"
          }`}
        >
          {tHome("tab_preview")}
        </button>
      </div>

      {tab === "upload" && (
        <>
          <div className="relative mb-6 space-y-2">
            <h1 className="text-2xl font-semibold" style={{ color: BRAND }}>
              {t("title")}
            </h1>
            <p className="text-sm text-gray-700">{t("description")}</p>
            <div
              className="mt-2"
              style={{ borderBottom: `2px solid ${BRAND}` }}
            />
          </div>

          <form
            className="relative max-w-xl space-y-5 rounded-lg border bg-white/70 p-5 shadow-sm backdrop-blur"
            onSubmit={handleSubmit(onSubmitRaw, () => {})}
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-800">
                {t("category_label")}
              </label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                {...register("category")}
              >
                <option value="daily-report">{tDash("daily_title")}</option>
                <option value="weekly-report">{tDash("weekly_title")}</option>
                <option value="research-report">
                  {tDash("research_title")}
                </option>
                <option value="ai-news">{tDash("ai_news_title")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-800">
                {t("file_label")}
              </label>
              <div
                className="cursor-pointer rounded border border-dashed border-gray-300 bg-gray-100 px-3 py-10 text-center text-sm font-semibold text-gray-600"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.click()
                  }
                }}
                onDragOver={e => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  const f = e.dataTransfer.files?.[0]
                  if (f) {
                    setValue("file", f, { shouldValidate: true })
                    setValue("filename", f.name)
                    if (fileInputRef.current) {
                      const dt = new DataTransfer()
                      dt.items.add(f)
                      fileInputRef.current.files = dt.files
                    }
                    toast.success(t("toast_file_selected"))
                  }
                }}
              >
                {t("file_upload_hint")}
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setValue("file", f, { shouldValidate: true })
                    setValue("filename", f.name)
                    toast.success(t("toast_file_selected"))
                  }
                }}
              />
              {errors.file && (
                <p className="text-xs text-red-600">
                  {errors.file.message as string}
                </p>
              )}
              <input
                type="text"
                placeholder={t("filename_placeholder")}
                className="w-full rounded border px-3 py-2 text-sm"
                {...register("filename")}
              />
              <p className="text-xs text-neutral-800">{t("filename_hint")}</p>
            </div>

            <div className="space-y-1 pt-2">
              <p className="text-xs text-gray-700">
                {t("target_key")}{" "}
                <span className="font-mono">{derivedKey || t("pending")}</span>
              </p>
              <p className="text-xs text-red-500">{t("target_key_hint")}</p>
            </div>

            <div className="space-x-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-[#ddae58] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t("uploading") : t("upload")}
              </button>

              <button
                type="button"
                onClick={() => {
                  reset()
                  setResult(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                  toast(t("toast_form_reset"))
                }}
                className="rounded border border-[#ddae58] bg-white px-4 py-2 text-sm font-medium text-[#ddae58] hover:bg-[#ddae58]/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("reset_form_button")}
              </button>
            </div>

            {result && (
              <div className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-900">
                <div>{t("uploaded")}</div>
                <div className="mt-1 font-mono">{result.key}</div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-blue-700 underline"
                >
                  {t("open")}
                </a>
              </div>
            )}
          </form>
        </>
      )}

      {tab === "preview" && (
        <div className="space-y-6">
          <div className="relative space-y-2">
            <h2 className="text-2xl font-semibold" style={{ color: BRAND }}>
              {tHome("preview_title")}
            </h2>
            <p className="text-sm text-gray-700">
              {tHome("preview_description")}
            </p>
            <div
              className="mt-2"
              style={{ borderBottom: `2px solid ${BRAND}` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-800">
                {tHome("preview_category_label")}
              </label>
              <select
                className="rounded border px-3 py-2 text-sm"
                value={previewCategory}
                onChange={e => {
                  const nextCategory = REPORT_CATEGORIES.find(
                    cat => cat === e.target.value
                  )
                  if (nextCategory) {
                    setPreviewCategory(nextCategory)
                    setPreviewPage(1)
                  }
                }}
              >
                <option value="daily-report">{tDash("daily_title")}</option>
                <option value="weekly-report">{tDash("weekly_title")}</option>
                <option value="research-report">
                  {tDash("research_title")}
                </option>
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
                  previewPage === 1
                }
                onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
              >
                {tDash("prev_page")}
              </button>
              <span className="text-xs text-gray-700">{previewPage}</span>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
                disabled={
                  isPreviewLoading || isPreviewFetching || !previewData?.hasNext
                }
                onClick={() => setPreviewPage(p => p + 1)}
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
              <p className="text-sm text-gray-700">
                {tHome("preview_loading")}
              </p>
            )}
            {isPreviewError && (
              <p className="text-sm text-red-600">{tHome("preview_error")}</p>
            )}
            {previewData &&
              previewData.groups.length === 0 &&
              !isPreviewLoading &&
              !isPreviewError && (
                <p className="text-sm text-gray-700">
                  {tHome("preview_empty")}
                </p>
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
                      {group.items.length} file
                      {group.items.length === 1 ? "" : "s"}
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
      )}
    </div>
  )
}
