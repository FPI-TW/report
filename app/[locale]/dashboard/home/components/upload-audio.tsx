"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { UploadApi } from "@/lib/api"
import { REPORT_CATEGORIES, type ReportCategory } from "./constants"

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

function getFileExtension(fileName: string) {
  const parts = fileName.split(".")
  if (parts.length < 2) return ""
  return parts[parts.length - 1]?.toLowerCase() ?? ""
}

function isValidAudioFile(file: File) {
  const extension = getFileExtension(file.name)
  return extension === "mp3" || extension === "mp4"
}

export default function UploadAudioSection() {
  const t = useTranslations("dashboard_upload_audio")
  const tDash = useTranslations("dashboard")
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
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

  const prefix = `${category}/audio/`

  const derivedName =
    filename && filename.trim().length > 0 ? filename : fileList?.name
  const derivedKey = derivedName ? `${prefix}${derivedName}` : ""

  function onSelectFile(file: File) {
    if (!isValidAudioFile(file)) {
      setError("file", {
        type: "validate",
        message: t("file_extension_error"),
      })
      setValue("file", null, { shouldValidate: true })
      setValue("filename", "")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      toast.error(t("toast_file_extension_error"))
      return
    }

    clearErrors("file")
    setValue("file", file, { shouldValidate: true })
    setValue("filename", file.name)
    toast.success(t("toast_file_selected"))
  }

  async function onSubmitRaw(data: FormValues) {
    if (!data.file || !isValidAudioFile(data.file)) {
      setError("file", {
        type: "validate",
        message: t("file_extension_error"),
      })
      toast.error(t("toast_file_extension_error"))
      return
    }

    clearErrors("file")

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
        await UploadApi.createAudioUploadUrl({
          category: parsed.data.category,
          filename:
            parsed.data.filename && parsed.data.filename.trim().length > 0
              ? parsed.data.filename
              : file.name,
          contentType: file.type || "audio/mpeg",
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
          "content-type": file.type || "audio/mpeg",
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
    <>
      <div className="relative mb-6 overflow-hidden rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-5">
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-sky-200/50 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M4 9v6M8 6v12M12 10v4M16 7v10M20 9v6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h1 className="text-2xl font-semibold text-sky-900">
                {t("title")}
              </h1>
            </div>
            <p className="text-sm text-sky-900/80">{t("description")}</p>
            <div className="flex items-end gap-1">
              <span className="h-1.5 w-1 rounded-full bg-sky-300" />
              <span className="h-3 w-1 rounded-full bg-sky-400" />
              <span className="h-2 w-1 rounded-full bg-cyan-400" />
              <span className="h-4 w-1 rounded-full bg-sky-500" />
              <span className="h-2 w-1 rounded-full bg-cyan-400" />
            </div>
          </div>
          <span className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            AUDIO
          </span>
        </div>
      </div>

      <form
        className="relative max-w-xl space-y-5 rounded-lg border border-sky-200 bg-sky-50/30 p-5 shadow-sm backdrop-blur"
        onSubmit={handleSubmit(onSubmitRaw, () => {})}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            {t("category_label")}
          </label>
          <select
            className="w-full rounded border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
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
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 font-mono text-xs text-sky-700">
              .mp3
            </span>
            <span className="rounded-full border border-cyan-300 bg-cyan-100 px-2 py-0.5 font-mono text-xs text-cyan-700">
              .mp4
            </span>
          </div>
          <div
            className="cursor-pointer rounded border border-dashed border-sky-300 bg-sky-50 px-3 py-10 text-center text-sm font-semibold text-sky-700"
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
                onSelectFile(f)
              }
            }}
          >
            {t("file_upload_hint")}
          </div>
          <input
            type="file"
            accept=".mp3,.mp4,audio/mpeg,audio/mp4"
            className="hidden"
            ref={fileInputRef}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) {
                onSelectFile(f)
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
            className="w-full rounded border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
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
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="rounded border border-sky-500 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
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
  )
}
