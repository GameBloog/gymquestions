import { describe, it, expect, beforeEach, vi } from "vitest"
import { ValidateInviteCodeUseCase } from "../../../../src/application/use-cases/invite-code/validate-invite-code"
import { InviteCodeRepository } from "../../../../src/application/repositories/invite-code-repository"
import { UserRole } from "../../../../src/domain/entities/user"
import { AppError } from "../../../../src/shared/errors/app-error"

describe("ValidateInviteCodeUseCase", () => {
  let validateUseCase: ValidateInviteCodeUseCase
  let inviteCodeRepository: InviteCodeRepository

  beforeEach(() => {
    inviteCodeRepository = {
      create: vi.fn(),
      findByCode: vi.fn(),
      markAsUsed: vi.fn(),
      findMany: vi.fn(),
    }
    validateUseCase = new ValidateInviteCodeUseCase(inviteCodeRepository)
  })

  it("should validate a valid invite code", async () => {
    const mockInviteCode = {
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: null,
      createdBy: "admin-123",
      createdAt: new Date(),
    }

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(
      mockInviteCode
    )

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.PROFESSOR)
    ).resolves.not.toThrow()
  })

  it("should throw error if invite code not found", async () => {
    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(null)

    await expect(
      validateUseCase.execute("INVALID-CODE", UserRole.PROFESSOR)
    ).rejects.toThrow(AppError)

    await expect(
      validateUseCase.execute("INVALID-CODE", UserRole.PROFESSOR)
    ).rejects.toThrow("Código de convite inválido")
  })

  it("should throw error if invite code already used", async () => {
    const mockInviteCode = {
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: "user-123",
      usedAt: new Date(),
      expiresAt: null,
      createdBy: "admin-123",
      createdAt: new Date(),
    }

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(
      mockInviteCode
    )

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.PROFESSOR)
    ).rejects.toThrow(AppError)

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.PROFESSOR)
    ).rejects.toThrow("Código de convite já foi utilizado")
  })

  it("should throw error if invite code expired", async () => {
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 1)

    const mockInviteCode = {
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: expiredDate,
      createdBy: "admin-123",
      createdAt: new Date(),
    }

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(
      mockInviteCode
    )

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.PROFESSOR)
    ).rejects.toThrow(AppError)

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.PROFESSOR)
    ).rejects.toThrow("Código de convite expirado")
  })

  it("should throw error if role mismatch", async () => {
    const mockInviteCode = {
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: null,
      createdBy: "admin-123",
      createdAt: new Date(),
    }

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(
      mockInviteCode
    )

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.ADMIN)
    ).rejects.toThrow(AppError)

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.ADMIN)
    ).rejects.toThrow(
      "Código de convite não é válido para este tipo de usuário"
    )
  })

  it("should accept valid code with future expiration", async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)

    const mockInviteCode = {
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: futureDate,
      createdBy: "admin-123",
      createdAt: new Date(),
    }

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(
      mockInviteCode
    )

    await expect(
      validateUseCase.execute("PROF-2025-ABC123", UserRole.PROFESSOR)
    ).resolves.not.toThrow()
  })
})
