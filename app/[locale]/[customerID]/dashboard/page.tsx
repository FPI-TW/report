"use client"

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

import { useTranslations } from "next-intl"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

type ApiBrief = { key: string; date: string; url: string }
type ApiGroup = { year: number; month: number; items: ApiBrief[] }
type ApiResponse = {
  page: number
  months: number
  hasPrev: boolean
  hasNext: boolean
  groups: ApiGroup[]
}

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const BRAND = "#ddae58"
  const t = useTranslations("dashboard")
  const months = 6

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["briefs", page, months],
    queryFn: async () => {
      const res = await fetch(`/api/briefs?page=${page}&months=${months}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
  })

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8">
      {/* subtle brand-tinted background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 0% 0%, rgba(221, 174, 88, 0.10), transparent 60%)",
        }}
      />
      <header className="relative mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: BRAND }}>
          {t("title")}
        </h1>
        <p className="text-sm text-gray-700">{t("subtitle")}</p>
        <div className="mt-3" style={{ borderBottom: `2px solid ${BRAND}` }} />
      </header>

      <div className="relative space-y-10">
        {isLoading && <p className="text-sm text-gray-700">{t("loading")}</p>}
        {isError && <p className="text-sm text-red-600">{t("error")}</p>}
        {data && data.groups.length === 0 && !isLoading && !isError && (
          <p className="text-sm text-gray-700">{t("empty")}</p>
        )}
        {data &&
          data.groups.map(group => (
            <section
              key={`${group.year}-${group.month}`}
              aria-labelledby={`year-${group.year}`}
              className="space-y-6"
            >
              <h2
                id={`year-${group.year}`}
                className="border-l-4 pl-3 text-xl font-semibold text-gray-900"
                style={{ borderColor: BRAND }}
              >
                {group.year}
              </h2>

              <div className="space-y-3">
                <h3
                  className="text-base font-medium"
                  style={{ color: "rgba(221, 174, 88, 0.85)" }}
                >
                  {monthLabel(group.month)} {group.year}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map(item => (
                    <article
                      key={item.key}
                      className="group cursor-pointer overflow-hidden rounded-lg border bg-white/75 p-3 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
                      style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
                      onClick={async () => {
                        const w = window.open("", "_blank")
                        if (!w) return
                        try {
                          const res = await fetch(
                            `/api/briefs/url?key=${encodeURIComponent(item.key)}`,
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
                      }}
                    >
                      <div
                        className="flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-md border"
                        style={{
                          borderColor: "rgba(221, 174, 88, 0.35)",
                          background:
                            "linear-gradient(135deg, rgba(221, 174, 88, 0.08), rgba(221, 174, 88, 0.02))",
                        }}
                      >
                        <Image
                          src="/icon/pdf.svg"
                          alt="PDF"
                          width={48}
                          height={48}
                          className="opacity-80"
                        />
                      </div>
                      <div className="mt-3 space-y-1">
                        <h4 className="line-clamp-1 text-sm font-medium text-gray-900">
                          {item.date}
                        </h4>
                        <p
                          className="text-xs"
                          style={{ color: "rgba(221, 174, 88, 0.9)" }}
                        >
                          {new Date(item.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ))}
      </div>

      {data && (
        <div className="mt-8 flex items-center justify-between">
          <button
            className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
            disabled={!data.hasPrev || page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            {t("prev_page")}
          </button>
          <span className="text-xs text-gray-700">{data.page}</span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "rgba(221, 174, 88, 0.35)" }}
            disabled={!data.hasNext}
            onClick={() => setPage(p => p + 1)}
          >
            {t("next_page")}
          </button>
        </div>
      )}
    </div>
  )
}
