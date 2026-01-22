"use client"

import { useTranslations } from "next-intl"

type TabOption = {
  value: "daily-report" | "weekly-report" | "research-report" | "ai-news"
  label: string
}

type TabsProps = {
  value: TabOption["value"]
  onChange: (value: TabOption["value"]) => void
}

export default function Tabs({ value, onChange }: TabsProps) {
  const t = useTranslations("dashboard")
  const OPTIONS: TabOption[] = [
    { value: "daily-report", label: t("tab_daily") },
    { value: "weekly-report", label: t("tab_weekly") },
    { value: "research-report", label: t("tab_research") },
    { value: "ai-news", label: t("tab_ai_news") },
  ]

  return (
    <div className="flex flex-1 flex-wrap items-center gap-3">
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-w-28 rounded-full border px-4 py-1 text-base font-medium transition-colors sm:text-lg ${
              active
                ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                : "border-black/10 text-gray-800 hover:bg-black/5"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
