"use client"

import { useLocale, useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import useChooseLocale from "@/hooks/useChooseLocale"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsDialog({ isOpen, onClose }: Props) {
  const router = useRouter()
  const params = useParams<{ customerID: string }>()
  const locale = useLocale()
  const t = useTranslations("dashboard")

  const chooseLocale = useChooseLocale()

  const languageOptions = [
    { value: "en", label: t("lang_en") },
    { value: "zh-hant", label: t("lang_zh_hant") },
    { value: "zh-hans", label: t("lang_zh_hans") },
  ]

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error("logout_failed")
      toast.success(t("logout_success"))
      onClose()
      router.replace(`/${locale}/${params.customerID ?? ""}`)
    } catch {
      toast.error(t("logout_error"))
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="min-w-0">
          <DialogHeader>
            <DialogTitle>{t("settings_title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">
                {t("language_label")}
              </p>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(option => {
                  const isActive = option.value === locale
                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        chooseLocale(option.value)
                        onClose()
                      }}
                      disabled={isActive}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="flex-col items-stretch pt-2 sm:flex-col sm:items-stretch">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                {t("logout")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
