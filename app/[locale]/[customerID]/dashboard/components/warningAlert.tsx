"use client"

import { AlertTriangleIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import useWarningAlert from "../hooks/useWarningAlert"

/**
 * 警示彈窗
 *
 * 每次開啟都顯示，共兩個須接受的條款
 * 1. 隱私條款
 * 2. 免責聲明
 */
export default function WarningAlert() {
  const t = useTranslations("common")
  const { warningCounts, acceptDisclaimer, acceptAgreement } = useWarningAlert()

  const type = warningCounts === 0 ? "confidentialityAgreement" : "disclaimer"
  const onClose = warningCounts === 0 ? acceptAgreement : acceptDisclaimer

  if (warningCounts >= 2) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="warning-dialog-title"
      aria-describedby="warning-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />

      <div
        className="relative z-10 w-[min(92dvw,640px)] max-w-[92dvw] rounded-xl border border-black/10 bg-white shadow-2xl outline-none dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        {type === "confidentialityAgreement" ? (
          <ConfidentialityAgreement />
        ) : (
          <Disclaimer />
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 border-t border-black/10 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="focus-visible:ring-ring rounded-md px-3 py-2 text-base font-semibold text-white hover:bg-gray-800 focus-visible:ring-2 focus-visible:outline-none"
            style={{ backgroundColor: "#ddae58" }}
          >
            {t("i_accept")}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfidentialityAgreement() {
  const t = useTranslations("warning")

  const content = [
    t("confidentiality_agreement.content_1"),
    t("confidentiality_agreement.content_2"),
    t("confidentiality_agreement.content_3"),
    t("confidentiality_agreement.content_4"),
    t("confidentiality_agreement.content_5"),
    t("confidentiality_agreement.content_6"),
    t("confidentiality_agreement.content_7"),
    t("confidentiality_agreement.content_8"),
  ]

  return (
    <>
      {/* Header */}
      <div className="space-y-2 border-b border-black/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="size-5 text-amber-600" aria-hidden />
          <h2
            id="warning-dialog-title"
            className="text-lg font-bold sm:text-xl"
          >
            {t("confidentiality_agreement.title")}
          </h2>
        </div>

        <h3 className="font-semibold">
          {t("confidentiality_agreement.subtitle")}
        </h3>
      </div>

      {/* Body - scrollable long text */}
      <ol className="max-h-[70vh] list-outside list-decimal space-y-4 overflow-y-auto p-4">
        {content.map((item, index) => {
          if (index === 0) {
            return <p key={index}>{item}</p>
          }

          return (
            <li key={index} className="ml-4">
              {item}
            </li>
          )
        })}
      </ol>
    </>
  )
}
function Disclaimer() {
  const t = useTranslations("warning")

  const content = [
    t("disclaimer.content_1"),
    t("disclaimer.content_2"),
    t("disclaimer.content_3"),
    t("disclaimer.content_4"),
    t("disclaimer.content_5"),
    t("disclaimer.content_6"),
    t("disclaimer.content_7"),
    t("disclaimer.content_8"),
    t("disclaimer.content_9"),
    t("disclaimer.content_10"),
    t("disclaimer.content_11"),
  ]

  return (
    <>
      {/* Header */}
      <div className="space-y-2 border-b border-black/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="size-5 text-amber-600" aria-hidden />
          <h2
            id="warning-dialog-title"
            className="text-lg font-bold sm:text-xl"
          >
            {t("disclaimer.title")}
          </h2>
        </div>

        <h3 className="font-semibold">{t("disclaimer.subtitle")}</h3>
      </div>

      {/* Body - scrollable long text */}
      <ol className="max-h-[70vh] list-outside list-decimal space-y-4 overflow-y-auto p-4 pl-5">
        {content.map((item, index) => {
          return (
            <li key={index} className="ml-4">
              {item}
            </li>
          )
        })}
      </ol>
    </>
  )
}
