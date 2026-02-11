"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import UploadPage from "./page"
import { useAuthStore } from "@/store/auth"

export default function Layout() {
  const isAuthed = useDashboardGate()

  return isAuthed ? <UploadPage /> : null
}

function useDashboardGate() {
  const router = useRouter()
  const params = useParams() as { locale?: string }
  const locale = params?.locale ?? ""
  const token = useAuthStore(state => state.token)
  const isAuthed = Boolean(token)

  useEffect(() => {
    if (!isAuthed && locale) {
      router.replace(`/${locale}/dashboard`)
    }
  }, [isAuthed, locale, router])

  return isAuthed
}
