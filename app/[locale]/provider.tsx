"use client"

import { NextIntlClientProvider } from "next-intl"
import type { AbstractIntlMessages } from "next-intl"
import type { ReactNode } from "react"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
}

type Props = {
  children: ReactNode
  messages: AbstractIntlMessages
  locale: string
  timeZone: string
}

export default function Provider({
  children,
  messages,
  locale,
  timeZone,
}: Props) {
  const [queryClient] = useState(() => new QueryClient(queryConfig))

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        messages={messages}
        locale={locale}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  )
}
