export type AuthResult = { ok: boolean; message?: string }

// Simple in-memory validation based on customerID.
// For now, accept account `${customerID}-admin` with password `password123`.
export async function validateLogin(
  customerID: string,
  account: string,
  password: string
): Promise<AuthResult> {
  // Simulate I/O latency
  await new Promise(r => setTimeout(r, 250))

  const expectedAccount = `${customerID}`
  const expectedPassword = "123456"

  if (account !== expectedAccount) {
    return { ok: false, message: "Unknown account for this customer" }
  }
  if (password !== expectedPassword) {
    return { ok: false, message: "Incorrect password" }
  }
  return { ok: true }
}
