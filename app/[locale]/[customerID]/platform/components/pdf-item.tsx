"use client"

import Image from "next/image"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export type PdfSource = { key: string; date: string; url: string }

type Props = {
  item: PdfSource
  name?: string | undefined
}

export default function PdfItem({ item, name }: Props) {
  const t = useTranslations("dashboard")
  const displayName = name ?? item.date

  const handleClick = async () => {
    const w = window.open("", "_blank")
    if (!w) return
    try {
      const res = await fetch(
        `/api/reports/url?key=${encodeURIComponent(item.key)}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error("sign_failed")
      const data: { url: string } = await res.json()
      w.opener = null
      w.location.href = data.url
    } catch {
      toast.error(t("error"))
      w.close()
    }
  }

  return (
    <article
      className="flex cursor-pointer flex-col items-center justify-between space-y-1.5 transition-all hover:-translate-y-0.5"
      style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
      onClick={handleClick}
    >
      <Image
        src="/icon/pdf.svg"
        alt="PDF"
        width={64}
        height={64}
        className="opacity-80"
      />
      <div className="h-full">
        <h4 className="text-center text-base font-medium break-all whitespace-normal text-gray-900 sm:text-lg">
          {displayName}
        </h4>
      </div>
    </article>
  )
}
