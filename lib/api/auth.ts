import { apiFetch } from "./axios"

export type LoginRequest = {
  username: string
  password: string
}

export type LoginSuccessResponse = {
  access_token: string
  expires_in: number
  token_type: "bearer"
}

export type LoginErrorResponse = {
  ok?: false
  error?: string
  detail?: string
}

export type LoginResponse = LoginSuccessResponse | LoginErrorResponse

export async function login(
  body: LoginRequest
): Promise<{ response: Response; data: LoginResponse }> {
  const response = await apiFetch("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as LoginResponse

  return { response, data }
}
