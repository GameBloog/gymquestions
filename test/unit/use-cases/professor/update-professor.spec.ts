import { describe, it, expect, beforeEach, vi } from "vitest"
import { UpdateProfessorUseCase } from "../../../../src/application/use-cases/professor/update-professor"
import { ProfessorRepository } from "../../../../src/application/repositories/professor-repository"
import { UserRepository } from "../../../../src/application/repositories/user-repository"
import { UserRole } from "../../../../src/domain/entities/user"
import { AppError } from "../../../../src/shared/errors/app-error"

describe("UpdateProfessorUseCase", () => {
  let updateProfessorUseCase: UpdateProfessorUseCase
  let professorRepository: ProfessorRepository
  let userRepository: UserRepository

  beforeEach(() => {
    professorRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findMany: vi.fn(),
      findPadrao: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    userRepository = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    updateProfessorUseCase = new UpdateProfessorUseCase(
      professorRepository,
      userRepository,
    )
  })

  it("should update professor profile and linked user data", async () => {
    const professor = {
      id: "prof-123",
      userId: "user-123",
      telefone: "11999999999",
      especialidade: "Musculação",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.spyOn(professorRepository, "findById").mockResolvedValue(professor)
    vi.spyOn(professorRepository, "update").mockResolvedValue({
      ...professor,
      telefone: "11988888888",
      especialidade: "Funcional",
    })
    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-123",
      nome: "Professor Test",
      email: "professor@test.com",
      password: "hashed-password",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)
    vi.spyOn(userRepository, "update").mockResolvedValue({
      id: "user-123",
      nome: "Professor Atualizado",
      email: "novoprof@test.com",
      password: "hashed-new-password",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await updateProfessorUseCase.execute("prof-123", {
      nome: "Professor Atualizado",
      email: "novoprof@test.com",
      password: "novaSenha123",
      telefone: "11988888888",
      especialidade: "Funcional",
    })

    expect(userRepository.update).toHaveBeenCalledWith("user-123", {
      nome: "Professor Atualizado",
      email: "novoprof@test.com",
      password: "novaSenha123",
    })
    expect(professorRepository.update).toHaveBeenCalledWith("prof-123", {
      telefone: "11988888888",
      especialidade: "Funcional",
    })
  })

  it("should allow updating only linked user data", async () => {
    const professor = {
      id: "prof-123",
      userId: "user-123",
      telefone: "11999999999",
      especialidade: "Musculação",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.spyOn(professorRepository, "findById").mockResolvedValue(professor)
    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-123",
      nome: "Professor Test",
      email: "professor@test.com",
      password: "hashed-password",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)
    vi.spyOn(userRepository, "update").mockResolvedValue({
      id: "user-123",
      nome: "Professor Atualizado",
      email: "professor@test.com",
      password: "hashed-password",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await updateProfessorUseCase.execute("prof-123", {
      nome: "Professor Atualizado",
    })

    expect(result).toEqual(professor)
    expect(professorRepository.update).not.toHaveBeenCalled()
    expect(userRepository.update).toHaveBeenCalledWith("user-123", {
      nome: "Professor Atualizado",
    })
  })

  it("should reject duplicated email when updating linked user data", async () => {
    const professor = {
      id: "prof-123",
      userId: "user-123",
      telefone: "11999999999",
      especialidade: "Musculação",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.spyOn(professorRepository, "findById").mockResolvedValue(professor)
    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-123",
      nome: "Professor Test",
      email: "professor@test.com",
      password: "hashed-password",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue({
      id: "other-user",
      nome: "Outro Usuário",
      email: "duplicado@test.com",
      password: "hashed-password",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(
      updateProfessorUseCase.execute("prof-123", {
        email: "duplicado@test.com",
      }),
    ).rejects.toThrow(AppError)

    await expect(
      updateProfessorUseCase.execute("prof-123", {
        email: "duplicado@test.com",
      }),
    ).rejects.toThrow("Email já cadastrado")
  })
})
