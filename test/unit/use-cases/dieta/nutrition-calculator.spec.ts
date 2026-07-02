import { describe, expect, it, vi } from "vitest"
import { SexoBiologico } from "@prisma/client"
import {
  calculateLeanMassKg,
  calculateNavyBodyFat,
} from "../../../../src/application/use-cases/dieta/nutrition-calculator"
import { CreateAlunoHistoricoUseCase } from "../../../../src/application/use-cases/history/create-aluno-history"
import type { AlunoRepository } from "../../../../src/application/repositories/aluno-repository"
import type { AlunoHistoricoRepository } from "../../../../src/application/repositories/aluno-history-repository"
import type { Aluno } from "../../../../src/domain/entities/aluno"
import type {
  AlunoHistorico,
  CreateAlunoHistoricoInput,
} from "../../../../src/domain/entities/aluno-history"

const maleBodyFat = 14.522776402958698
const femaleBodyFat = 36.45331872164371

const buildAluno = (overrides: Partial<Aluno> = {}): Aluno => ({
  id: "aluno-1",
  userId: "user-1",
  professorId: "professor-1",
  ativo: true,
  sexoBiologico: "MASCULINO",
  alturaCm: 185,
  pesoKg: 85,
  cinturaCm: 86,
  quadrilCm: null,
  pescocoCm: 40,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

const buildRepositories = (aluno: Aluno) => {
  const historicoRepository: AlunoHistoricoRepository = {
    create: vi.fn(async (data: CreateAlunoHistoricoInput) => ({
      id: "historico-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      dataRegistro: data.dataRegistro ?? new Date("2026-01-01T00:00:00.000Z"),
      ...data,
    }) as AlunoHistorico),
    findById: vi.fn(),
    findByAlunoId: vi.fn(),
    findLatestByAlunoId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const alunoRepository: AlunoRepository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(aluno),
    findByUserId: vi.fn(),
    findMany: vi.fn(),
    findManyByProfessor: vi.fn(),
    update: vi.fn().mockResolvedValue(aluno),
    delete: vi.fn(),
  }

  return { historicoRepository, alunoRepository }
}

describe("nutrition calculator", () => {
  it("calculates male US Navy body fat using centimeter inputs", () => {
    const bodyFat = calculateNavyBodyFat({
      sexoBiologico: SexoBiologico.MASCULINO,
      alturaCm: 185,
      cinturaCm: 86,
      pescocoCm: 40,
    })
    const fatMass = 85 * (bodyFat! / 100)
    const leanMass = calculateLeanMassKg(85, bodyFat)

    expect(bodyFat).toBeCloseTo(maleBodyFat, 12)
    expect(fatMass).toBeCloseTo(12.344359942514894, 12)
    expect(leanMass).toBeCloseTo(72.6556400574851, 12)
  })

  it("calculates female US Navy body fat using centimeter inputs", () => {
    const bodyFat = calculateNavyBodyFat({
      sexoBiologico: SexoBiologico.FEMININO,
      alturaCm: 159,
      cinturaCm: 88,
      quadrilCm: 98,
      pescocoCm: 33,
    })
    const fatMass = 68 * (bodyFat! / 100)
    const leanMass = calculateLeanMassKg(68, bodyFat)

    expect(bodyFat).toBeCloseTo(femaleBodyFat, 12)
    expect(fatMass).toBeCloseTo(24.78825673071772, 12)
    expect(leanMass).toBeCloseTo(43.21174326928228, 12)
  })

  it("returns null for invalid Navy body fat inputs", () => {
    expect(
      calculateNavyBodyFat({
        sexoBiologico: SexoBiologico.MASCULINO,
        alturaCm: 185,
        cinturaCm: 40,
        pescocoCm: 40,
      })
    ).toBeNull()

    expect(
      calculateNavyBodyFat({
        sexoBiologico: SexoBiologico.FEMININO,
        alturaCm: 159,
        cinturaCm: 88,
        pescocoCm: 33,
      })
    ).toBeNull()

    expect(
      calculateNavyBodyFat({
        sexoBiologico: SexoBiologico.MASCULINO,
        alturaCm: 0,
        cinturaCm: 86,
        pescocoCm: 40,
      })
    ).toBeNull()
  })

  it("calculates body fat and lean mass when creating history without manual override", async () => {
    const { historicoRepository, alunoRepository } = buildRepositories(buildAluno())
    const useCase = new CreateAlunoHistoricoUseCase(
      historicoRepository,
      alunoRepository
    )

    const result = await useCase.execute({
      alunoId: "aluno-1",
      registradoPor: "user-1",
      pesoKg: 85,
    })

    expect(result.percentualGordura).toBeCloseTo(maleBodyFat, 12)
    expect(result.massaMuscularKg).toBeCloseTo(72.6556400574851, 12)
  })

  it("rejects history without a measurement or observation", async () => {
    const { historicoRepository, alunoRepository } = buildRepositories(buildAluno())
    const useCase = new CreateAlunoHistoricoUseCase(
      historicoRepository,
      alunoRepository
    )

    await expect(
      useCase.execute({
        alunoId: "aluno-1",
        registradoPor: "user-1",
      })
    ).rejects.toMatchObject({
      message: "Informe pelo menos uma medida ou uma observação",
      statusCode: 400,
    })
    expect(historicoRepository.create).not.toHaveBeenCalled()
  })

  it("preserves manual body fat and lean mass overrides when creating history", async () => {
    const { historicoRepository, alunoRepository } = buildRepositories(buildAluno())
    const useCase = new CreateAlunoHistoricoUseCase(
      historicoRepository,
      alunoRepository
    )

    const result = await useCase.execute({
      alunoId: "aluno-1",
      registradoPor: "user-1",
      percentualGordura: 20,
      massaMuscularKg: 68,
    })

    expect(result.percentualGordura).toBe(20)
    expect(result.massaMuscularKg).toBe(68)
  })
})
