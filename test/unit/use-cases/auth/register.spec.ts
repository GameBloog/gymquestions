import { describe, it, expect, beforeEach, vi } from "vitest"
import { RegisterUseCase } from "../../../../src/application/use-cases/auth/register"
import { UserRepository } from "../../../../src/application/repositories/user-repository"
import { InviteCodeRepository } from "../../../../src/application/repositories/invite-code-repository"
import { ProfessorRepository } from "../../../../src/application/repositories/professor-repository"
import { AlunoRepository } from "../../../../src/application/repositories/aluno-repository"
import { UserRole } from "../../../../src/domain/entities/user"
import { AppError } from "../../../../src/shared/errors/app-error"

describe("RegisterUseCase", () => {
  let registerUseCase: RegisterUseCase
  let userRepository: UserRepository
  let inviteCodeRepository: InviteCodeRepository
  let professorRepository: ProfessorRepository
  let alunoRepository: AlunoRepository

  beforeEach(() => {
    // Mock dos repositórios com tipagem correta
    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    } as unknown as UserRepository

    inviteCodeRepository = {
      create: vi.fn(),
      findByCode: vi.fn(),
      markAsUsed: vi.fn(),
      findMany: vi.fn(),
    } as unknown as InviteCodeRepository

    professorRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findMany: vi.fn(),
      findPadrao: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as ProfessorRepository

    alunoRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findMany: vi.fn(),
      findManyByProfessor: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as AlunoRepository

    registerUseCase = new RegisterUseCase(
      userRepository,
      inviteCodeRepository,
      professorRepository,
      alunoRepository
    )
  })

  it("should register a new ALUNO without invite code", async () => {
    // Arrange - Configurar mocks
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "user-123",
      email: "aluno@test.com",
      password: "hashedPassword",
      nome: "Aluno Test",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Mock para findMany retornar professor padrão
    vi.spyOn(professorRepository, "findMany").mockResolvedValue([
      {
        id: "prof-padrao",
        userId: "user-prof",
        isPadrao: true,
        telefone: null,
        especialidade: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ])

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

    // Act - Executar o caso de uso
    const result = await registerUseCase.execute({
      nome: "Aluno Test",
      email: "aluno@test.com",
      password: "password123",
    })

    // Assert - Verificar resultados
    expect(result).toHaveProperty("id")
    expect(result).toHaveProperty("email", "aluno@test.com")
    expect(result).toHaveProperty("nome", "Aluno Test")
    expect(result).not.toHaveProperty("password")
    expect(userRepository.create).toHaveBeenCalledWith({
      nome: "Aluno Test",
      email: "aluno@test.com",
      password: "password123",
      role: UserRole.ALUNO,
    })
    expect(alunoRepository.create).toHaveBeenCalled()
  })

  it("should throw error if email already exists", async () => {
    // Arrange - Email já existe
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue({
      id: "existing-user",
      email: "existing@test.com",
      password: "hashedPassword",
      nome: "Existing User",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Act & Assert
    await expect(
      registerUseCase.execute({
        nome: "New User",
        email: "existing@test.com",
        password: "password123",
      })
    ).rejects.toThrow(AppError)

    await expect(
      registerUseCase.execute({
        nome: "New User",
        email: "existing@test.com",
        password: "password123",
      })
    ).rejects.toThrow("Email já cadastrado")
  })

  it("should require invite code for PROFESSOR registration", async () => {
    // Arrange
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    // Act & Assert - Deve lançar erro sem código de convite
    await expect(
      registerUseCase.execute({
        nome: "Professor Test",
        email: "professor@test.com",
        password: "password123",
        role: UserRole.PROFESSOR,
      })
    ).rejects.toThrow(AppError)

    await expect(
      registerUseCase.execute({
        nome: "Professor Test",
        email: "professor@test.com",
        password: "password123",
        role: UserRole.PROFESSOR,
      })
    ).rejects.toThrow("Código de convite é obrigatório")
  })

  it("should validate invite code for PROFESSOR registration", async () => {
    // Arrange
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue({
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: null,
      createdBy: "admin-123",
      createdAt: new Date(),
    })

    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "user-123",
      email: "professor@test.com",
      password: "hashedPassword",
      nome: "Professor Test",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.spyOn(professorRepository, "create").mockResolvedValue({
      id: "prof-123",
      userId: "user-123",
      telefone: null,
      especialidade: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.spyOn(inviteCodeRepository, "markAsUsed").mockResolvedValue(undefined)

    // Act
    const result = await registerUseCase.execute({
      nome: "Professor Test",
      email: "professor@test.com",
      password: "password123",
      role: UserRole.PROFESSOR,
      inviteCode: "PROF-2025-ABC123",
    })

    // Assert
    expect(result).toHaveProperty("id")
    expect(result).toHaveProperty("email", "professor@test.com")
    expect(inviteCodeRepository.findByCode).toHaveBeenCalledWith(
      "PROF-2025-ABC123"
    )
    expect(inviteCodeRepository.markAsUsed).toHaveBeenCalledWith(
      "PROF-2025-ABC123",
      "user-123"
    )
    expect(professorRepository.create).toHaveBeenCalled()
  })

  it("should create professor profile when registering PROFESSOR", async () => {
    // Arrange
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue({
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: null,
      createdBy: "admin-123",
      createdAt: new Date(),
    })

    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "user-123",
      email: "professor@test.com",
      password: "hashedPassword",
      nome: "Professor Test",
      role: UserRole.PROFESSOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.spyOn(professorRepository, "create").mockResolvedValue({
      id: "prof-123",
      userId: "user-123",
      telefone: "11987654321",
      especialidade: "Musculação",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.spyOn(inviteCodeRepository, "markAsUsed").mockResolvedValue(undefined)

    // Act
    await registerUseCase.execute({
      nome: "Professor Test",
      email: "professor@test.com",
      password: "password123",
      role: UserRole.PROFESSOR,
      inviteCode: "PROF-2025-ABC123",
      telefone: "11987654321",
      especialidade: "Musculação",
    })

    // Assert
    expect(professorRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        telefone: "11987654321",
        especialidade: "Musculação",
      })
    )
  })

  it("should throw error if professor padrão is not configured", async () => {
    // Arrange - Sem professor padrão
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "user-123",
      email: "aluno@test.com",
      password: "hashedPassword",
      nome: "Aluno Test",
      role: UserRole.ALUNO,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Mock retorna array vazio (sem professor padrão)
    vi.spyOn(professorRepository, "findMany").mockResolvedValue([])

    // Act & Assert
    await expect(
      registerUseCase.execute({
        nome: "Aluno Test",
        email: "aluno@test.com",
        password: "password123",
      })
    ).rejects.toThrow("Professor padrão não configurado no sistema")
  })

  it("should throw error if invite code is invalid", async () => {
    // Arrange
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)
    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue(null)

    // Act & Assert
    await expect(
      registerUseCase.execute({
        nome: "Professor Test",
        email: "professor@test.com",
        password: "password123",
        role: UserRole.PROFESSOR,
        inviteCode: "INVALID-CODE",
      })
    ).rejects.toThrow("Código de convite inválido")
  })

  it("should throw error if invite code is already used", async () => {
    // Arrange
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue({
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: "another-user-id", // Já foi usado
      usedAt: new Date(),
      expiresAt: null,
      createdBy: "admin-123",
      createdAt: new Date(),
    })

    // Act & Assert
    await expect(
      registerUseCase.execute({
        nome: "Professor Test",
        email: "professor@test.com",
        password: "password123",
        role: UserRole.PROFESSOR,
        inviteCode: "PROF-2025-ABC123",
      })
    ).rejects.toThrow("Código de convite já foi utilizado")
  })

  it("should throw error if invite code is expired", async () => {
    // Arrange
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10) // 10 dias atrás

    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue({
      id: "code-123",
      code: "PROF-2025-ABC123",
      role: UserRole.PROFESSOR,
      usedBy: null,
      usedAt: null,
      expiresAt: pastDate, // Expirado
      createdBy: "admin-123",
      createdAt: new Date(),
    })

    // Act & Assert
    await expect(
      registerUseCase.execute({
        nome: "Professor Test",
        email: "professor@test.com",
        password: "password123",
        role: UserRole.PROFESSOR,
        inviteCode: "PROF-2025-ABC123",
      })
    ).rejects.toThrow("Código de convite expirado")
  })

  it("should register ADMIN with valid invite code", async () => {
    // Arrange
    vi.spyOn(userRepository, "findByEmail").mockResolvedValue(null)

    vi.spyOn(inviteCodeRepository, "findByCode").mockResolvedValue({
      id: "code-admin",
      code: "ADMIN-2025-XYZ789",
      role: UserRole.ADMIN,
      usedBy: null,
      usedAt: null,
      expiresAt: null,
      createdBy: "super-admin-123",
      createdAt: new Date(),
    })

    vi.spyOn(userRepository, "create").mockResolvedValue({
      id: "admin-123",
      email: "admin@test.com",
      password: "hashedPassword",
      nome: "Admin Test",
      role: UserRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.spyOn(inviteCodeRepository, "markAsUsed").mockResolvedValue(undefined)

    // Act
    const result = await registerUseCase.execute({
      nome: "Admin Test",
      email: "admin@test.com",
      password: "password123",
      role: UserRole.ADMIN,
      inviteCode: "ADMIN-2025-XYZ789",
    })

    // Assert
    expect(result).toHaveProperty("id")
    expect(result).toHaveProperty("role", UserRole.ADMIN)
    expect(inviteCodeRepository.markAsUsed).toHaveBeenCalledWith(
      "ADMIN-2025-XYZ789",
      "admin-123"
    )
  })
})
