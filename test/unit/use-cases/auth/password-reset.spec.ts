import { beforeEach, describe, expect, it } from "vitest"
import type {
  ConsumePasswordResetTokenInput,
  PasswordResetTokenRepository,
  ReplacePasswordResetTokenInput,
} from "../../../../src/application/repositories/password-reset-token-repository"
import type {
  EmailSender,
  SendEmailInput,
} from "../../../../src/application/repositories/email-sender"
import { RequestPasswordResetUseCase } from "../../../../src/application/use-cases/auth/request-password-reset"
import { ResetPasswordUseCase } from "../../../../src/application/use-cases/auth/reset-password"
import { hashPasswordResetToken } from "../../../../src/infraestructure/security/password-reset-token"
import { UserRole } from "../../../../src/domain/entities/user"
import { InMemoryUserRepository } from "../../../repositories/in-memory-user-repository"
import { AppError } from "../../../../src/shared/errors/app-error"

class InMemoryPasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  tokens: Array<ReplacePasswordResetTokenInput & { id: string }> = []
  deletedIds: string[] = []
  consumeResult = true
  consumed?: ConsumePasswordResetTokenInput

  async replaceActiveToken(input: ReplacePasswordResetTokenInput) {
    const token = { ...input, id: `token-${this.tokens.length + 1}` }
    this.tokens.push(token)
    return { id: token.id }
  }

  async deleteById(id: string) {
    this.deletedIds.push(id)
    this.tokens = this.tokens.filter((token) => token.id !== id)
  }

  async consumeAndResetPassword(input: ConsumePasswordResetTokenInput) {
    this.consumed = input
    return this.consumeResult
  }
}

class InMemoryEmailSender implements EmailSender {
  sent: SendEmailInput[] = []
  shouldSend = true

  async send(input: SendEmailInput) {
    this.sent.push(input)
    return this.shouldSend
  }
}

describe("Password reset use cases", () => {
  let users: InMemoryUserRepository
  let tokens: InMemoryPasswordResetTokenRepository
  let emails: InMemoryEmailSender

  beforeEach(() => {
    users = new InMemoryUserRepository()
    tokens = new InMemoryPasswordResetTokenRepository()
    emails = new InMemoryEmailSender()
  })

  it("creates a hashed one-time token and sends only the raw token by email", async () => {
    await users.create({
      nome: "Usuário Teste",
      email: "user@test.com",
      password: "old-password",
      role: UserRole.ALUNO,
    })
    const useCase = new RequestPasswordResetUseCase(users, tokens, emails)

    await useCase.execute({
      email: " USER@TEST.COM ",
      frontendOrigin: "https://app.gforce.test",
      expiresInMinutes: 30,
    })

    expect(tokens.tokens).toHaveLength(1)
    expect(emails.sent).toHaveLength(1)
    const resetUrl = emails.sent[0].text.match(/https:\/\/\S+/)?.[0]
    expect(resetUrl).toBeDefined()
    const rawToken = new URLSearchParams(new URL(resetUrl!).hash.slice(1)).get(
      "resetToken",
    )
    expect(rawToken).toBeTruthy()
    expect(tokens.tokens[0].tokenHash).toBe(
      hashPasswordResetToken(rawToken!),
    )
    expect(tokens.tokens[0].tokenHash).not.toBe(rawToken)
    expect(tokens.tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it("does not reveal or create data for an unknown email", async () => {
    const useCase = new RequestPasswordResetUseCase(users, tokens, emails)

    await expect(
      useCase.execute({
        email: "unknown@test.com",
        frontendOrigin: "https://app.gforce.test",
        expiresInMinutes: 30,
      }),
    ).resolves.toBeUndefined()

    expect(tokens.tokens).toHaveLength(0)
    expect(emails.sent).toHaveLength(0)
  })

  it("removes the token when the email cannot be sent", async () => {
    await users.create({
      nome: "Usuário Teste",
      email: "user@test.com",
      password: "old-password",
      role: UserRole.ALUNO,
    })
    emails.shouldSend = false
    const useCase = new RequestPasswordResetUseCase(users, tokens, emails)

    await useCase.execute({
      email: "user@test.com",
      frontendOrigin: "https://app.gforce.test",
      expiresInMinutes: 30,
    })

    expect(tokens.tokens).toHaveLength(0)
    expect(tokens.deletedIds).toEqual(["token-1"])
  })

  it("hashes the received token before consuming it", async () => {
    const useCase = new ResetPasswordUseCase(tokens)

    await useCase.execute({
      token: "raw-reset-token",
      newPassword: "new-password-123",
    })

    expect(tokens.consumed).toEqual({
      tokenHash: hashPasswordResetToken("raw-reset-token"),
      newPassword: "new-password-123",
    })
  })

  it("rejects an invalid, expired or already used token", async () => {
    tokens.consumeResult = false
    const useCase = new ResetPasswordUseCase(tokens)

    await expect(
      useCase.execute({
        token: "invalid-reset-token",
        newPassword: "new-password-123",
      }),
    ).rejects.toBeInstanceOf(AppError)
  })
})
