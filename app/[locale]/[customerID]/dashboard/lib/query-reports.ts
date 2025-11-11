export async function queryReports(page: number, months: number) {
  const res = await fetch(`/api/reports?page=${page}&months=${months}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("failed")
  return res.json()
}
