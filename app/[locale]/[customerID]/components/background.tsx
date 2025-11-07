"use client"

import Image from "next/image"

export default function Background({ customerID }: { customerID: string }) {
  const bgSrc = `/${customerID}/background.webp`
  const fallbackSrc = `/default-background.webp`

  return (
    <Image
      src={bgSrc}
      alt="background"
      fill
      className="absolute size-full opacity-90"
      onError={e => (e.currentTarget.src = fallbackSrc)}
    />
  )
}
