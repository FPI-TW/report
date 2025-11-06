"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
// import { validateLogin } from "@/lib/auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useLocale, useTranslations } from "next-intl"

type LoginValues = {
  account: string
  password: string
}

type LoginFormProps = {
  customerID: string
}

export default function LoginForm({ customerID }: LoginFormProps) {
  const t = useTranslations("login")
  const locale = useLocale()
  const loginSchema = z.object({
    account: z.string().min(1, t("account_required")),
    password: z.string().min(6, t("password_min")),
  })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { account: "", password: "" },
    mode: "onSubmit",
  })

  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: LoginValues) => {
    setServerError(null)

    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach(issue => {
        const field = issue.path[0]
        if (field === "account" || field === "password") {
          setError(field, { type: "zod", message: issue.message })
        }
      })
      return
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerID,
        account: values.account,
        password: values.password,
      }),
    })
    if (!res.ok) {
      const msg = t("invalid_credentials")
      setServerError(msg)
      toast.error(msg)
      return
    }

    toast.success(t("logged_in_success"))
    router.push(`/${locale}/${customerID}/dashboard`)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative w-full max-w-sm overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5"
      style={{
        backgroundImage: `url('/${customerID}/background.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* backdrop for readability */}
      <div className="bg-white/80 px-6 py-8 backdrop-blur-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("welcome")}
          </h2>
          <p className="text-sm text-gray-600">
            {t("customer_line", { id: customerID })}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              {t("account_label")}
            </label>
            <Input
              type="text"
              autoComplete="username"
              className="border-neutral-800 bg-transparent text-gray-900 placeholder:text-gray-500 valid:bg-none"
              {...register("account")}
            />

            {errors.account && (
              <p className="mt-1 text-xs text-red-600">
                {errors.account.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              {t("password_label")}
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              className="border-neutral-800 bg-transparent text-gray-900 placeholder:text-gray-500"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Inline messages are kept minimal; toasts are primary feedback */}
          {serverError && <p className="text-sm text-red-700">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isSubmitting ? t("signing_in") : t("sign_in")}
          </button>
        </div>
      </div>
    </form>
  )
}
