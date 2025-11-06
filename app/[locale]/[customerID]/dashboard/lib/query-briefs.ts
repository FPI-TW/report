export async function queryBriefs(page: number, months: number) {
  const res = await fetch(`/api/briefs?page=${page}&months=${months}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("failed")
  return res.json()
}
