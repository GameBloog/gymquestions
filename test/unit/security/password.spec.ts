import { describe, it, expect } from "vitest"
import { PasswordHelper } from "@/infraestructure/security/password"

describe("PasswordHelper", () => {
  describe("hash", () => {
    it("should hash a password", async () => {
      const password = "mySecretPassword123"
      const hashedPassword = await PasswordHelper.hash(password)

      expect(hashedPassword).toBeTruthy()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50)
    })

    it("should generate different hashes for same password", async () => {
      const password = "samePassword123"
      const hash1 = await PasswordHelper.hash(password)
      const hash2 = await PasswordHelper.hash(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe("compare", () => {
    it("should return true for matching password", async () => {
      const password = "correctPassword123"
      const hashedPassword = await PasswordHelper.hash(password)

      const isMatch = await PasswordHelper.compare(password, hashedPassword)

      expect(isMatch).toBe(true)
    })

    it("should return false for non-matching password", async () => {
      const password = "correctPassword123"
      const wrongPassword = "wrongPassword123"
      const hashedPassword = await PasswordHelper.hash(password)

      const isMatch = await PasswordHelper.compare(
        wrongPassword,
        hashedPassword
      )

      expect(isMatch).toBe(false)
    })

    it("should handle empty passwords", async () => {
      const password = ""
      const hashedPassword = await PasswordHelper.hash(password)

      const isMatch = await PasswordHelper.compare(password, hashedPassword)

      expect(isMatch).toBe(true)
    })
  })
})
