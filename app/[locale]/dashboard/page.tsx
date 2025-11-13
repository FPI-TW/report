"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { useRouter, useParams } from "next/navigation"

const schema = z.object({
  account: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
})

type Values = z.infer<typeof schema>

export default function DashboardLoginPage() {
  const { register, handleSubmit, formState } = useForm<Values>({
    mode: "onSubmit",
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams() as { locale?: string }
  const locale = params?.locale || ""

  async function onSubmit(data: Values) {
    setError(null)
    const parsed = schema.safeParse(data)
    if (!parsed.success) return
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerID: "tingfong",
        account: parsed.data.account,
        password: parsed.data.password,
      }),
    })
    const body = await resp.json().catch(() => ({}))
    if (!resp.ok || !body?.ok) {
      setError(body?.error || "Login failed")
      return
    }
    router.replace(`/${locale}/dashboard/upload`)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-lg border bg-white/80 p-6 shadow-sm backdrop-blur">
        <h1 className="mb-4 text-xl font-semibold">Internal Dashboard Login</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Account</label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              {...register("account")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Password</label>
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
            {formState.isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-600">
          Only super users can access Upload in this dashboard.
        </p>
      </div>
    </div>
  )
}
