export async function queryDailyReport(page: number, months: number) {
  const res = await fetch(`/api/daily-report?page=${page}&months=${months}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("failed")
  return res.json()
}
