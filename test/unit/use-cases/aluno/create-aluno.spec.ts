import { describe, it, expect, beforeEach, vi } from "vitest"
import { CreateAlunoUseCase } from "../.././../../src/application/use-cases/aluno/create-alunos"
import { AlunoRepository } from "../.././../../src/application/repositories/aluno-repository"
import { UserRepository } from "../.././../../src/application/repositories/user-repository"
import { ProfessorRepository } from "../.././../../src/application/repositories/professor-repository"
import { UserRole } from "../.././../../src/domain/entities/user"
import { AppError } from "../.././../../src/shared/errors/app-error"

describe("CreateAlunoUseCase", () => {
  let createAlunoUseCase: CreateAlunoUseCase
  let alunoRepository: AlunoRepository
  let userRepository: UserRepository
  let professorRepository: ProfessorRepository

  beforeEach(() => {
    alunoRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findMany: vi.fn(),
      findManyByProfessor: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    }
    professorRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findMany: vi.fn(),
      findPadrao: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    createAlunoUseCase = new CreateAlunoUseCase(
      alunoRepository,
      userRepository,
      professorRepository
    )
  })

  it("should create a new aluno", async () => {
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findById").mockResolvedValue({
      id: "prof-123",
      userId: "user-prof",
      telefone: null,
      especialidade: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "user-123",
      email: "aluno@test.com",
      password: "hashedPassword",
      nome: "Aluno Test",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(alunoRepository, "create").mockResolvedValue({
      id: "aluno-123",
      userId: "user-123",
      professorId: "prof-123",
      telefone: "11999999999",
      alturaCm: 180,
      pesoKg: 80,
      idade: 25,
      cinturaCm: null,
      quadrilCm: null,
      pescocoCm: null,
      alimentos_quer_diario: null,
      alimentos_nao_comem: null,
      alergias_alimentares: null,
      dores_articulares: null,
      suplementos_consumidos: null,
      dias_treino_semana: 3,
      frequencia_horarios_refeicoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createAlunoUseCase.execute({
      nome: "Aluno Test",
      email: "aluno@test.com",
      password: "password123",
      professorId: "prof-123",
      telefone: "11999999999",
      alturaCm: 180,
      pesoKg: 80,
      idade: 25,
      dias_treino_semana: 3,
    })

    expect(result).toHaveProperty("id")
    expect(result.userId).toBe("user-123")
    expect(result.professorId).toBe("prof-123")
  })

  it("should throw error if email already exists", async () => {
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue({
      id: "existing-user",
      email: "existing@test.com",
      password: "hashedPassword",
      nome: "Existing User",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(
      createAlunoUseCase.execute({
        nome: "Aluno Test",
        email: "existing@test.com",
        password: "password123",
        professorId: "prof-123",
      })
    ).rejects.toThrow(AppError)

    await expect(
      createAlunoUseCase.execute({
        nome: "Aluno Test",
        email: "existing@test.com",
        password: "password123",
        professorId: "prof-123",
      })
    ).rejects.toThrow("Email já cadastrado")
  })

  it("should fallback to professor padrão if professor not found", async () => {
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findById").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findByUserId").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findPadrao").mockResolvedValue({
      id: "prof-padrao",
      userId: "user-prof-padrao",
      telefone: null,
      especialidade: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "user-123",
      email: "aluno@test.com",
      password: "hashedPassword",
      nome: "Aluno Test",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(alunoRepository, "create").mockResolvedValue({
      id: "aluno-123",
      userId: "user-123",
      professorId: "prof-padrao",
      telefone: null,
      alturaCm: null,
      pesoKg: null,
      idade: null,
      cinturaCm: null,
      quadrilCm: null,
      pescocoCm: null,
      alimentos_quer_diario: null,
      alimentos_nao_comem: null,
      alergias_alimentares: null,
      dores_articulares: null,
      suplementos_consumidos: null,
      dias_treino_semana: null,
      frequencia_horarios_refeicoes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createAlunoUseCase.execute({
      nome: "Aluno Test",
      email: "aluno@test.com",
      password: "password123",
      professorId: "invalid-prof-id",
    })

    expect(result.professorId).toBe("prof-padrao")
  })

  it("should throw error if no professor padrão configured", async () => {
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findById").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findByUserId").mockResolvedValue(null)
    vi.spyOn(professorRepository, "findPadrao").mockResolvedValue(null)

    await expect(
      createAlunoUseCase.execute({
        nome: "Aluno Test",
        email: "aluno@test.com",
        password: "password123",
        professorId: "invalid-prof-id",
      })
    ).rejects.toThrow(AppError)

    await expect(
      createAlunoUseCase.execute({
        nome: "Aluno Test",
        email: "aluno@test.com",
        password: "password123",
        professorId: "invalid-prof-id",
      })
    ).rejects.toThrow("Professor padrão não configurado")
  })
})
