import axios, { type AxiosRequestConfig, type Method } from "axios"
import { useAuthStore } from "@/store/auth"

const API_BASE_URL = "https://api.tingfong.com/api" as const

const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

const normalizeMethod = (method: string | undefined): Method => {
  const upper = method?.toUpperCase()
  switch (upper) {
    case "DELETE":
    case "GET":
    case "HEAD":
    case "OPTIONS":
    case "PATCH":
    case "POST":
    case "PUT":
    case "PURGE":
    case "LINK":
    case "UNLINK":
      return upper
    default:
      return "GET"
  }
}

const mergeHeaders = (
  primary?: HeadersInit,
  fallback?: HeadersInit
): Headers => {
  const headers = new Headers(fallback)
  if (primary) {
    new Headers(primary).forEach((value, key) => {
      headers.set(key, value)
    })
  }
  return headers
}

const toAxiosHeaders = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

export const withAuthHeaders = (headers?: HeadersInit): Headers => {
  const merged = new Headers(headers)
  const token = useAuthStore.getState().token
  if (token && !merged.has("authorization")) {
    merged.set("authorization", `Bearer ${token}`)
  }
  return merged
}

const toResponseHeaders = (headers: unknown): Headers => {
  const responseHeaders = new Headers()
  if (!headers || typeof headers !== "object") {
    return responseHeaders
  }

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      responseHeaders.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      responseHeaders.set(key, value.join(","))
      continue
    }

    if (value !== null && value !== undefined) {
      responseHeaders.set(key, String(value))
    }
  }

  return responseHeaders
}

const toResponseBody = (data: unknown): BodyInit | null => {
  if (data === null || data === undefined) {
    return null
  }

  if (typeof data === "string") {
    return data
  }

  if (data instanceof ArrayBuffer) {
    return data
  }

  if (data instanceof Blob) {
    return data
  }

  if (data instanceof FormData) {
    return data
  }

  if (data instanceof URLSearchParams) {
    return data
  }

  if (typeof ReadableStream !== "undefined" && data instanceof ReadableStream) {
    return data
  }

  return JSON.stringify(data)
}

type ApiFetchInput = Parameters<typeof fetch>[0]
type ApiFetchInit = Parameters<typeof fetch>[1]

const resolveFetchRequest = async (
  input: ApiFetchInput,
  init?: ApiFetchInit
): Promise<{
  url: string
  method: Method
  headers: Headers
  body: BodyInit | null | undefined
  signal: AbortSignal | undefined
}> => {
  if (typeof input === "string" || input instanceof URL) {
    return {
      url: input.toString(),
      method: normalizeMethod(init?.method),
      headers: mergeHeaders(init?.headers),
      body: init?.body,
      signal: init?.signal ?? undefined,
    }
  }

  const headers = mergeHeaders(init?.headers, input.headers)
  const method = normalizeMethod(init?.method ?? input.method)
  const signal = init?.signal ?? input.signal ?? undefined
  let body = init?.body

  if (body === undefined && input.body !== null) {
    body = await input.clone().arrayBuffer()
  }

  return {
    url: input.url,
    method,
    headers,
    body,
    signal: signal ?? undefined,
  }
}

export const apiFetch = async (
  input: ApiFetchInput,
  init?: ApiFetchInit
): Promise<Response> => {
  const { url, method, headers, body, signal } = await resolveFetchRequest(
    input,
    init
  )

  console.log(url)

  const axiosConfig: AxiosRequestConfig<BodyInit | null | undefined> = {
    url,
    method,
    data: body,
    headers: toAxiosHeaders(headers),
    validateStatus: () => true,
  }

  if (signal) {
    axiosConfig.signal = signal
  }

  const axiosResponse = await apiClient.request(axiosConfig)

  const responseHeaders = toResponseHeaders(axiosResponse.headers)
  const responseBody = toResponseBody(axiosResponse.data)

  return new Response(responseBody, {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: responseHeaders,
  })
}
