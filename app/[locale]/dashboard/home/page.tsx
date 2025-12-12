"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { type ReportCategory } from "./components/constants"
import PreviewSection from "./components/preview"
import UploadSection from "./components/upload"
import UploadAudioSection from "./components/upload-audio"

export default function UploadPage() {
  const tHome = useTranslations("dashboard_home")

  const [tab, setTab] = useState<
    "upload-pdf" | "upload-audio" | "preview-pdf" | "preview-audio"
  >("upload-pdf")
  const [previewCategoryPdf, setPreviewCategoryPdf] =
    useState<ReportCategory>("daily-report")
  const [previewCategoryAudio, setPreviewCategoryAudio] =
    useState<ReportCategory>("daily-report")
  const [previewPagePdf, setPreviewPagePdf] = useState(1)
  const [previewPageAudio, setPreviewPageAudio] = useState(1)

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
            setTab("preview-pdf")
            setPreviewPagePdf(1)
          }}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            tab === "preview-pdf"
              ? "bg-[#ddae58] text-white shadow"
              : "border border-[#ddae58] text-[#ddae58]"
          }`}
        >
          {tHome("tab_preview_pdf")}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("preview-audio")
            setPreviewPageAudio(1)
          }}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            tab === "preview-audio"
              ? "bg-[#ddae58] text-white shadow"
              : "border border-[#ddae58] text-[#ddae58]"
          }`}
        >
          {tHome("tab_preview_audio")}
        </button>
      </div>

      <div className={tab === "upload-pdf" ? "" : "hidden"}>
        <UploadSection />
      </div>
      <div className={tab === "upload-audio" ? "" : "hidden"}>
        <UploadAudioSection />
      </div>
      <div className={tab === "preview-pdf" ? "" : "hidden"}>
        <PreviewSection
          isActive={tab === "preview-pdf"}
          category={previewCategoryPdf}
          page={previewPagePdf}
          fileType="pdf"
          onCategoryChange={setPreviewCategoryPdf}
          onPageChange={setPreviewPagePdf}
        />
      </div>
      <div className={tab === "preview-audio" ? "" : "hidden"}>
        <PreviewSection
          isActive={tab === "preview-audio"}
          category={previewCategoryAudio}
          page={previewPageAudio}
          fileType="audio"
          onCategoryChange={setPreviewCategoryAudio}
          onPageChange={setPreviewPageAudio}
        />
      </div>
    </div>
  )
}
