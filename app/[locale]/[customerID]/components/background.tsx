"use client"

import { useState } from "react"
import Image from "next/image"

const fallbackSrc = `/image/background.webp`

export default function Background({ customerID }: { customerID: string }) {
  console.log(customerID)
  const initialSrc = `/cuam/background.webp`
  const [src, setSrc] = useState(initialSrc)

  return (
    <Image
      src={src}
      alt="background"
      fill
      className="absolute size-full object-cover opacity-90"
      onError={() => src !== fallbackSrc && setSrc(fallbackSrc)}
      unoptimized
      priority
    />
  )
}
