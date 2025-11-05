type Brief = {
  id: string
  title: string
  date: string // ISO string
  summary?: string
  href?: string // pdf link (to be added later)
}

const briefs: Brief[] = [
  {
    id: "2025-11-01-q4-update",
    title: "Q4 Strategic Update",
    date: "2025-11-01",
    summary: "Key milestones and targets for Q4.",
  },
  {
    id: "2025-11-15-market-outlook",
    title: "Market Outlook",
    date: "2025-11-15",
    summary: "Macro signals and sector rotation.",
  },
  {
    id: "2025-10-08-ops-review",
    title: "Operations Review",
    date: "2025-10-08",
    summary: "Ops KPIs and risk register highlights.",
  },
  {
    id: "2024-12-20-year-end",
    title: "Year-end Brief",
    date: "2024-12-20",
    summary: "Close-out and FY wrap.",
  },
  {
    id: "2024-07-05-midyear",
    title: "Midyear Summary",
    date: "2024-07-05",
    summary: "Midyear achievements and deltas.",
  },
]

function groupByYearMonth(items: Brief[]) {
  const map = new Map<number, Map<number, Brief[]>>()
  for (const b of items) {
    const d = new Date(b.date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1 // 1-12
    if (!map.has(year)) map.set(year, new Map())
    const monthMap = map.get(year)!
    if (!monthMap.has(month)) monthMap.set(month, [])
    monthMap.get(month)!.push(b)
  }
  // sort briefs in each month by descending date
  for (const [, monthMap] of map) {
    for (const [, arr] of monthMap) {
      arr.sort((a, b) => +new Date(b.date) - +new Date(a.date))
    }
  }
  return map
}

function monthLabel(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })
}

export default function DashboardPage() {
  const grouped = groupByYearMonth(briefs)
  const years = Array.from(grouped.keys()).sort((a, b) => b - a)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Briefs</h1>
          <p className="text-sm text-gray-600">Grouped by year and month</p>
        </div>
      </header>

      <div className="space-y-10">
        {years.map(year => {
          const monthMap = grouped.get(year)!
          const months = Array.from(monthMap.keys()).sort((a, b) => b - a)
          return (
            <section
              key={year}
              aria-labelledby={`year-${year}`}
              className="space-y-6"
            >
              <h2
                id={`year-${year}`}
                className="text-xl font-semibold text-gray-900"
              >
                {year}
              </h2>

              {months.map(month => (
                <div key={`${year}-${month}`} className="space-y-3">
                  <h3 className="text-base font-medium text-gray-800">
                    {monthLabel(month)} {year}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {monthMap.get(month)!.map(item => (
                      <article
                        key={item.id}
                        className="group overflow-hidden rounded-lg border border-neutral-300 bg-white/70 p-3 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden rounded-md border border-neutral-300 bg-neutral-100">
                          <div className="flex h-full items-center justify-center text-neutral-400">
                            <span className="text-xs">PDF placeholder</span>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          <h4 className="line-clamp-1 text-sm font-medium text-gray-900">
                            {item.title}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {new Date(item.date).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            })}
                          </p>
                          {item.summary && (
                            <p className="line-clamp-2 text-xs text-gray-700">
                              {item.summary}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
