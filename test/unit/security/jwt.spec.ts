import { describe, it, expect } from "vitest"
import { JwtHelper } from "../../../src/infraestructure/security/jwt"
import { UserRole } from "../../../src/domain/entities/user"

describe("JwtHelper", () => {
  describe("generate", () => {
    it("should generate a valid JWT token", () => {
      const payload = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        role: UserRole.ALUNO,
      }

      const token = JwtHelper.generate(payload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })

    it("should generate different tokens for different payloads", () => {
      const payload1 = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        email: "test1@example.com",
        role: UserRole.ALUNO,
      }

      const payload2 = {
        userId: "123e4567-e89b-12d3-a456-426614174001",
        email: "test2@example.com",
        role: UserRole.PROFESSOR,
      }

      const token1 = JwtHelper.generate(payload1)
      const token2 = JwtHelper.generate(payload2)

      expect(token1).not.toBe(token2)
    })
  })

  describe("verify", () => {
    it("should verify and decode a valid token", () => {
      const payload = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        role: UserRole.ADMIN,
      }

      const token = JwtHelper.generate(payload)
      const decoded = JwtHelper.verify(token)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
      expect(decoded.role).toBe(payload.role)
    })

    it("should throw error for invalid token", () => {
      const invalidToken = "invalid.token.here"

      expect(() => JwtHelper.verify(invalidToken)).toThrow()
    })

    it("should throw error for tampered token", () => {
      const payload = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        role: UserRole.ALUNO,
      }

      const token = JwtHelper.generate(payload)
      const tamperedToken = token.slice(0, -5) + "XXXXX"

      expect(() => JwtHelper.verify(tamperedToken)).toThrow()
    })
  })
})
