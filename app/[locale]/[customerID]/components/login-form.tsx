"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { validateLogin } from "@/lib/auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const loginSchema = z.object({
  account: z.string().min(1, "Account is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginValues = z.infer<typeof loginSchema>

type LoginFormProps = {
  customerID: string
}

export default function LoginForm({ customerID }: LoginFormProps) {
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

    const result = await validateLogin(
      customerID,
      values.account,
      values.password
    )
    if (!result.ok) {
      const msg = result.message ?? "Invalid credentials"
      setServerError(msg)
      toast.error(msg)
      return
    }

    toast.success("Logged in successfully")
    router.push(`/${customerID}/dashboard`)
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
      <div className="bg-white/70 p-6 backdrop-blur-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">Welcome</h2>
          <p className="text-sm text-gray-600">Customer: {customerID}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Account
            </label>
            <input
              type="text"
              autoComplete="username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400"
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
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400"
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
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </form>
  )
}
