import { describe, it, expect, beforeEach, vi } from "vitest"
import { UpdateAlunoUseCase } from "../.././../../src/application/use-cases/aluno/update-aluno"
import { AlunoRepository } from "../.././../../src/application/repositories/aluno-repository"
import { AppError } from "../.././../../src/shared/errors/app-error"

describe("UpdateAlunoUseCase", () => {
  let updateAlunoUseCase: UpdateAlunoUseCase
  let alunoRepository: AlunoRepository

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
    updateAlunoUseCase = new UpdateAlunoUseCase(alunoRepository)
  })

  it("should update aluno data", async () => {
    const mockAluno = {
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
    }

    const updatedAluno = {
      ...mockAluno,
      pesoKg: 85,
      dias_treino_semana: 5,
    }

    vi.spyOn(alunoRepository, "findById").mockResolvedValue(mockAluno)
    vi.spyOn(alunoRepository, "update").mockResolvedValue(updatedAluno)

    const result = await updateAlunoUseCase.execute("aluno-123", {
      pesoKg: 85,
      dias_treino_semana: 5,
    })

    expect(result.pesoKg).toBe(85)
    expect(result.dias_treino_semana).toBe(5)
    expect(alunoRepository.update).toHaveBeenCalledWith("aluno-123", {
      pesoKg: 85,
      dias_treino_semana: 5,
    })
  })

  it("should throw error if aluno not found", async () => {
    vi.spyOn(alunoRepository, "findById").mockResolvedValue(null)

    await expect(
      updateAlunoUseCase.execute("non-existent-id", {
        pesoKg: 85,
      })
    ).rejects.toThrow(AppError)

    await expect(
      updateAlunoUseCase.execute("non-existent-id", {
        pesoKg: 85,
      })
    ).rejects.toThrow("Aluno não encontrado")
  })

  it("should update partial data", async () => {
    const mockAluno = {
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
    }

    vi.spyOn(alunoRepository, "findById").mockResolvedValue(mockAluno)
    vi.spyOn(alunoRepository, "update").mockResolvedValue({
      ...mockAluno,
      telefone: "11988888888",
    })

    const result = await updateAlunoUseCase.execute("aluno-123", {
      telefone: "11988888888",
    })

    expect(result.telefone).toBe("11988888888")
    expect(result.pesoKg).toBe(80) 
  })

  it("should update array fields", async () => {
    const mockAluno = {
      id: "aluno-123",
      userId: "user-123",
      professorId: "prof-123",
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
    }

    const newAlimentos = ["arroz", "frango", "batata"]
    const newAlergias = ["lactose"]

    vi.spyOn(alunoRepository, "findById").mockResolvedValue(mockAluno)
    vi.spyOn(alunoRepository, "update").mockResolvedValue({
      ...mockAluno,
      alimentos_quer_diario: newAlimentos as any,
      alergias_alimentares: newAlergias as any,
    })

    const result = await updateAlunoUseCase.execute("aluno-123", {
      alimentos_quer_diario: newAlimentos,
      alergias_alimentares: newAlergias,
    })

    expect(result.alimentos_quer_diario).toEqual(newAlimentos)
    expect(result.alergias_alimentares).toEqual(newAlergias)
  })
})
