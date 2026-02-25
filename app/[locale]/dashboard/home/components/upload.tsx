"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { UploadApi } from "@/lib/api"
import { BRAND, REPORT_CATEGORIES, type ReportCategory } from "./constants"

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

function isValidPdfFile(file: File) {
  return getFileExtension(file.name) === "pdf"
}

export default function UploadSection() {
  const t = useTranslations("dashboard_upload")
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

  const prefix = `${category}/pdf/`

  const derivedName =
    filename && filename.trim().length > 0 ? filename : fileList?.name
  const derivedKey = derivedName ? `${prefix}${derivedName}` : ""

  function onSelectFile(file: File) {
    if (!isValidPdfFile(file)) {
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
    if (!data.file || !isValidPdfFile(data.file)) {
      setError("file", {
        type: "validate",
        message: t("file_extension_error"),
      })
      toast.error(t("toast_file_extension_error"))
      return
    }

    clearErrors("file")

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
        await UploadApi.createPdfUploadUrl({
          category: parsed.data.category,
          filename:
            parsed.data.filename && parsed.data.filename.trim().length > 0
              ? parsed.data.filename
              : file.name,
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
    <>
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
                onSelectFile(f)
              }
            }}
          >
            {t("file_upload_hint")}
          </div>
          <input
            type="file"
            accept=".pdf,application/pdf"
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
  )
}
