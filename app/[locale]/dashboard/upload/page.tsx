"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

const schema = z.object({
  category: z.enum([
    "daily-report",
    "weekly-report",
    "research-report",
    "ai-news",
  ]),
  file: z
    .instanceof(File)
    .refine(f => f && f.size > 0, "File is required")
    .refine(f => f.size <= 50 * 1024 * 1024, "File must be <= 50MB"),
  filename: z.string().optional(),
})

type FormValues = {
  category: "daily-report" | "weekly-report" | "research-report" | "ai-news"
  file: File | null
  filename?: string
}

const BRAND = "#ddae58" as const

export default function UploadPage() {
  const t = useTranslations("dashboard_upload")
  const tDash = useTranslations("dashboard")
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

  async function onSubmitRaw(data: FormValues) {
    // Validate with zod at runtime (file optional in RHF, required in schema)
    const parsed = schema.safeParse({
      category: data.category,
      filename: data.filename,
      file: data.file,
    })

    if (!parsed.success) return
    const filenameToUse =
      (parsed.data.filename && parsed.data.filename.trim()) ||
      parsed.data.file.name
    const contentType = parsed.data.file.type || "application/octet-stream"

    try {
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: parsed.data.category,
          filename: filenameToUse,
          contentType,
        }),
      })
      const meta = await resp.json().catch(() => ({}))
      if (!resp.ok || !meta?.ok || !meta?.uploadUrl) {
        throw new Error(meta?.message || meta?.error || "Upload init failed")
      }

      const proxyFormData = new FormData()
      proxyFormData.append("uploadUrl", meta.uploadUrl)
      proxyFormData.append("contentType", contentType)
      proxyFormData.append("file", parsed.data.file)

      const uploadResp = await fetch("/api/upload/proxy", {
        method: "POST",
        body: proxyFormData,
      })

      if (!uploadResp.ok) {
        throw new Error("Upload failed")
      }

      setResult({ key: meta.key, url: meta.url })
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
    <div>
      <div className="relative mb-6 space-y-2">
        <h1 className="text-2xl font-semibold" style={{ color: BRAND }}>
          {t("title")}
        </h1>
        <p className="text-sm text-gray-700">{t("description")}</p>
        <div className="mt-2" style={{ borderBottom: `2px solid ${BRAND}` }} />
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
            <option value="research-report">{tDash("research_title")}</option>
            <option value="ai-news">{tDash("ai_news_title")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            {t("file_label")}
          </label>
          <div
            className="cursor-pointer rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-6 text-xs text-gray-600"
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
    </div>
  )
}
