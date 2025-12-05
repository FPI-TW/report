import { requireSuperUser } from "@/lib/admin"
import { redirect } from "next/navigation"
import UploadPage from "./page"

export default async function DashboardGate({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const claims = await requireSuperUser()

  if (!claims) {
    redirect(`/${locale}/dashboard`)
  }

  return <UploadPage />
}
