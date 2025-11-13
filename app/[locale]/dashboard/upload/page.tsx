"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
    // if (!data.file) return

    // Validate with zod at runtime (file optional in RHF, required in schema)
    const parsed = schema.safeParse({
      category: data.category,
      filename: data.filename,
      file: data.file,
    })

    if (!parsed.success) return
    const form = new FormData()
    form.append("category", parsed.data.category)
    form.append("file", parsed.data.file)
    if (parsed.data.filename) form.append("filename", parsed.data.filename)

    const resp = await fetch("/api/upload", { method: "POST", body: form })
    const body = await resp.json().catch(() => ({}))
    if (!resp.ok || !body?.ok) {
      throw new Error(body?.message || body?.error || "Upload failed")
    }
    setResult({ key: body.key, url: body.url })
    reset({ category: parsed.data.category, filename: "" })
  }

  return (
    <div>
      <div className="relative mb-6 space-y-2">
        <h1 className="text-2xl font-semibold" style={{ color: BRAND }}>
          Upload Reports
        </h1>
        <p className="text-sm text-gray-700">
          Choose a category and upload a file. Object key uses the same
          bucket/prefix as the GET APIs.
        </p>
        <div className="mt-2" style={{ borderBottom: `2px solid ${BRAND}` }} />
      </div>

      <form
        className="relative max-w-xl space-y-5 rounded-lg border bg-white/70 p-5 shadow-sm backdrop-blur"
        onSubmit={handleSubmit(onSubmitRaw, () => {})}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            Category
          </label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            {...register("category")}
          >
            <option value="daily-report">Daily Report</option>
            <option value="weekly-report">Weekly Report</option>
            <option value="research-report">Research Report</option>
            <option value="ai-news">AI News</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            File (PDF)
          </label>
          <input
            type="file"
            accept="application/pdf"
            className="w-full rounded border px-3 py-2 text-sm"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) {
                setValue("file", f, { shouldValidate: true })
                setValue("filename", f.name)
              }
            }}
            // {...register("file", {
            //   onChange: e => {
            //     const list = (e.target as HTMLInputElement).files
            //     const f = list?.[0]
            //     if (f) {
            //       setValue("file", f, { shouldValidate: true })
            //       setValue("filename", f.name)
            //     }
            //   },
            // })}
          />
          {errors.file && (
            <p className="text-xs text-red-600">
              {errors.file.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            Object filename (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 2024-11-01.pdf"
            className="w-full rounded border px-3 py-2 text-sm"
            {...register("filename")}
          />
          <p className="text-xs text-gray-600">
            If provided, this overrides the uploaded file name.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-700">
            Target key:{" "}
            <span className="font-mono">{derivedKey || "(pending)"}</span>
          </p>
          <p className="text-xs text-gray-500">
            Include a date like YYYY-MM-DD in the filename for correct grouping.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-[#ddae58] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Uploading..." : "Upload"}
          </button>
        </div>

        {result && (
          <div className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-900">
            <div>Uploaded</div>
            <div className="mt-1 font-mono">{result.key}</div>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-blue-700 underline"
            >
              Open
            </a>
          </div>
        )}
      </form>
    </div>
  )
}
