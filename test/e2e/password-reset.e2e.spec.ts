import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { app } from "../../src/app"
import { emailService } from "../../src/infraestructure/notifications/email.service"
import type { SendEmailInput } from "../../src/application/repositories/email-sender"
import { hashPasswordResetToken } from "../../src/infraestructure/security/password-reset-token"
import {
  cleanDatabase,
  createTestAdmin,
  prismaTest,
  teardownTestDatabase,
} from "../helpers/test-helpers"

function extractResetToken(email: SendEmailInput): string {
  const resetUrl = email.text.match(/https?:\/\/\S+/)?.[0]
  if (!resetUrl) throw new Error("Link de recuperação não encontrado no email")

  const token = new URLSearchParams(new URL(resetUrl).hash.slice(1)).get(
    "resetToken",
  )
  if (!token) throw new Error("Token de recuperação não encontrado no link")

  return token
}

describe("Password reset E2E", () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(async () => {
    vi.restoreAllMocks()
    await cleanDatabase()
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await teardownTestDatabase()
    await app.close()
  })

  it("requests, consumes once, changes the password and revokes sessions", async () => {
    const user = await createTestAdmin()
    let sentEmail: SendEmailInput | undefined
    vi.spyOn(emailService, "send").mockImplementation(async (input) => {
      sentEmail = input
      return true
    })

    const loginBeforeReset = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "admin123" },
    })
    expect(loginBeforeReset.statusCode).toBe(200)

    const requestResponse = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: user.email.toUpperCase() },
    })

    expect(requestResponse.statusCode).toBe(202)
    expect(requestResponse.json()).toEqual({
      message:
        "Se o email estiver cadastrado, as instruções de redefinição serão enviadas.",
    })
    expect(sentEmail).toBeDefined()

    const rawToken = extractResetToken(sentEmail!)
    const storedToken = await prismaTest.passwordResetToken.findFirst({
      where: { userId: user.id },
    })
    expect(storedToken?.tokenHash).toBe(hashPasswordResetToken(rawToken))
    expect(storedToken?.tokenHash).not.toBe(rawToken)

    const resetResponse = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: rawToken, newPassword: "new-password-123" },
    })
    expect(resetResponse.statusCode).toBe(200)

    const reusedResponse = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: rawToken, newPassword: "another-password-123" },
    })
    expect(reusedResponse.statusCode).toBe(400)

    const oldPasswordLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "admin123" },
    })
    expect(oldPasswordLogin.statusCode).toBe(401)

    const newPasswordLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "new-password-123" },
    })
    expect(newPasswordLogin.statusCode).toBe(200)

    const activeOldSessions = await prismaTest.refreshSession.count({
      where: {
        userId: user.id,
        createdAt: { lt: new Date() },
        revokedAt: null,
      },
    })
    expect(activeOldSessions).toBe(1)
    const revokedSessions = await prismaTest.refreshSession.count({
      where: { userId: user.id, revokedAt: { not: null } },
    })
    expect(revokedSessions).toBe(1)
  })

  it("returns the same accepted response for an unknown email", async () => {
    const sendSpy = vi.spyOn(emailService, "send").mockResolvedValue(true)

    const response = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "unknown@test.com" },
    })

    expect(response.statusCode).toBe(202)
    expect(response.json()).toEqual({
      message:
        "Se o email estiver cadastrado, as instruções de redefinição serão enviadas.",
    })
    expect(sendSpy).not.toHaveBeenCalled()
    expect(await prismaTest.passwordResetToken.count()).toBe(0)
  })

  it("rejects expired tokens without changing the password", async () => {
    const user = await createTestAdmin()
    let sentEmail: SendEmailInput | undefined
    vi.spyOn(emailService, "send").mockImplementation(async (input) => {
      sentEmail = input
      return true
    })

    await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: user.email },
    })
    const rawToken = extractResetToken(sentEmail!)
    await prismaTest.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const response = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: rawToken, newPassword: "new-password-123" },
    })
    expect(response.statusCode).toBe(400)

    const oldPasswordLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "admin123" },
    })
    expect(oldPasswordLogin.statusCode).toBe(200)
  })

  it("validates email, token and password policy", async () => {
    const invalidEmail = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "not-an-email" },
    })
    expect(invalidEmail.statusCode).toBe(400)

    const weakPassword = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "x".repeat(43), newPassword: "short" },
    })
    expect(weakPassword.statusCode).toBe(400)
  })
})
