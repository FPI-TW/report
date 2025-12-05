"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { AuthApi } from "@/lib/api"

const schema = z.object({
  account: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
})

type Values = z.infer<typeof schema>

export default function DashboardLoginPage() {
  const t = useTranslations("dashboard_admin")
  const tLogin = useTranslations("login")
  const { register, handleSubmit, formState } = useForm<Values>({
    mode: "onSubmit",
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams() as { locale?: string }
  const locale = params?.locale || ""

  async function onSubmit(formValues: Values) {
    setError(null)
    const parsed = schema.safeParse(formValues)
    if (!parsed.success) return
    const { response, data } = await AuthApi.login({
      customerID: "tingfong",
      account: parsed.data.account,
      password: parsed.data.password,
    })
    if (!response.ok || !data?.ok) {
      const message =
        !data.ok && "error" in data && data.error ? data.error : "Login failed"
      setError(message)
      return
    }
    router.replace(`/${locale}/dashboard/home`)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-lg border bg-white/80 p-6 shadow-sm backdrop-blur">
        <h1 className="mb-4 text-xl font-semibold">{t("login_title")}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">
              {tLogin("account_label")}
            </label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              {...register("account")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">
              {tLogin("password_label")}
            </label>
            <input
              type="password"
              className="w-full rounded border px-3 py-2 text-sm"
              {...register("password")}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="rounded bg-[#ddae58] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {formState.isSubmitting ? tLogin("signing_in") : tLogin("sign_in")}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-600">{t("hint_super_only")}</p>
      </div>
    </div>
  )
}
