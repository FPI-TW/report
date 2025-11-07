"use client"

import { useState } from "react"
import Image from "next/image"

const fallbackSrc = `/image/default-background.webp`

export default function Background({ customerID }: { customerID: string }) {
  const initialSrc = `/${customerID}/background.webp`
  const [src, setSrc] = useState(initialSrc)

  return (
    <Image
      src={src}
      alt="background"
      fill
      className="absolute size-full opacity-90"
      onError={() => src !== fallbackSrc && setSrc(fallbackSrc)}
      unoptimized
      priority
    />
  )
}
