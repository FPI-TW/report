import { signJwt, verifyJwt, type SessionClaims } from "@/lib/session"

describe("session jwt", () => {
  const prev = process.env.AUTH_SECRET
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-please-change"
  })
  afterAll(() => {
    process.env.AUTH_SECRET = prev
  })

  it("signs and verifies a valid token", () => {
    const now = Math.floor(Date.now() / 1000)
    const claims: SessionClaims = {
      sub: "HK_00001:HK_00001",
      customerID: "HK_00001",
      account: "HK_00001",
      iat: now,
      exp: now + 60,
    }
    const token = signJwt(claims)
    const parsed = verifyJwt(token)
    expect(parsed).not.toBeNull()
    expect(parsed?.customerID).toBe("HK_00001")
  })

  it("rejects an expired token", () => {
    const now = Math.floor(Date.now() / 1000)
    const claims: SessionClaims = {
      sub: "x:y",
      customerID: "x",
      account: "y",
      iat: now - 120,
      exp: now - 60,
    }
    const token = signJwt(claims)
    // simulate after expiry
    const parsed = verifyJwt(token)
    // verifyJwt checks real time, so expired => null
    expect(parsed).toBeNull()
  })
})
