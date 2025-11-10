"use client"

import { useEffect, useState } from "react"
import useDialog from "@/hooks/useDialog"

export default function useWarningAlert() {
  const [warningCounts, setWarningCounts] = useState(0)
  const disclaimerDialog = useDialog()
  const agreementDialog = useDialog()

  useEffect(() => {
    if (warningCounts === 0) {
      agreementDialog.open()
    } else if (warningCounts === 1) {
      disclaimerDialog.open()
    }
  }, [warningCounts, agreementDialog, disclaimerDialog])

  const acceptDisclaimer = () => {
    setWarningCounts(w => w + 1)
    disclaimerDialog.close()
  }

  const acceptAgreement = () => {
    setWarningCounts(w => w + 1)
    agreementDialog.close()
  }

  return {
    warningCounts,
    disclaimerDialog,
    agreementDialog,
    acceptDisclaimer,
    acceptAgreement,
  }
}
