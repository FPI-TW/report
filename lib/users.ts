import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import console from "node:console"

export type UserRecord = {
  user_id: string
  account: string
  hash: string // base64 of scrypt-derived key
  salt: string // base64
  active?: boolean
}

let cache: UserRecord[] | null = null

function loadFromEnv(): UserRecord[] | null {
  const raw = process.env.USERS_JSON
  if (!raw) return null
  try {
    const data = JSON.parse(Buffer.from(raw, "base64").toString("utf8"))
    if (Array.isArray(data)) return data as UserRecord[]
    return null
  } catch (e) {
    console.error(e)
    return null
  }
}

function loadFromFile(): UserRecord[] | null {
  try {
    const file = path.join(process.cwd(), "users.json")
    if (!fs.existsSync(file)) return null
    const raw = fs.readFileSync(file, "utf8")
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data as UserRecord[]
    return null
  } catch {
    return null
  }
}

export function loadUsers(): UserRecord[] {
  if (cache) return cache
  const env = loadFromEnv()
  if (env) {
    cache = env
    return cache
  }
  const file = loadFromFile()
  if (file) {
    cache = file
    return cache
  }
  // No store found; return empty list (login will fail)
  cache = []
  return cache
}

export function findUserAccount(customerID: string, account: string) {
  const list = loadUsers()
  return list.find(
    r => r.user_id === customerID && r.account === account && (r.active ?? true)
  )
}

export function verifyPassword(
  password: string,
  saltB64: string,
  hashB64: string
) {
  const salt = Buffer.from(saltB64, "base64")
  const expected = Buffer.from(hashB64, "base64")
  const derived = crypto.scryptSync(password, salt, expected.length)
  return crypto.timingSafeEqual(derived, expected)
}
