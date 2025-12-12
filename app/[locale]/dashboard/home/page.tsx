"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { type ReportCategory } from "./components/constants"
import PreviewSection from "./components/preview"
import UploadSection from "./components/upload"
import UploadAudioSection from "./components/upload-audio"

export default function UploadPage() {
  const tHome = useTranslations("dashboard_home")

  const [tab, setTab] = useState<"upload-pdf" | "upload-audio" | "preview">(
    "upload-pdf"
  )
  const [previewCategory, setPreviewCategory] =
    useState<ReportCategory>("daily-report")
  const [previewPage, setPreviewPage] = useState(1)

  return (
    <div className="pb-3">
      <div className="mb-4 flex gap-3">
        <button
          type="button"
          onClick={() => setTab("upload-pdf")}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            tab === "upload-pdf"
              ? "bg-[#ddae58] text-white shadow"
              : "border border-[#ddae58] text-[#ddae58]"
          }`}
        >
          {tHome("tab_upload_pdf")}
        </button>
        <button
          type="button"
          onClick={() => setTab("upload-audio")}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            tab === "upload-audio"
              ? "bg-[#ddae58] text-white shadow"
              : "border border-[#ddae58] text-[#ddae58]"
          }`}
        >
          {tHome("tab_upload_audio")}
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

      <div className={tab === "upload-pdf" ? "" : "hidden"}>
        <UploadSection />
      </div>
      <div className={tab === "upload-audio" ? "" : "hidden"}>
        <UploadAudioSection />
      </div>
      <div className={tab === "preview" ? "" : "hidden"}>
        <PreviewSection
          isActive={tab === "preview"}
          category={previewCategory}
          page={previewPage}
          onCategoryChange={setPreviewCategory}
          onPageChange={setPreviewPage}
        />
      </div>
    </div>
  )
}
