"use client"
import { useEffect } from "react"

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>{error.message ?? "Something went wrong!"}</h2>
    </div>
  )
}
