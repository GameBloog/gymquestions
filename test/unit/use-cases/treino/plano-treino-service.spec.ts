import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  aluno: {
    findUnique: ReturnType<typeof vi.fn>
  }
  treinoCheckin: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

const buildPrismaMock = (): PrismaMock => ({
  aluno: {
    findUnique: vi.fn(),
  },
  treinoCheckin: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
})

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/application/use-cases/treino/plano-treino-service"
  )

  return module.PlanoTreinoService
}

describe("PlanoTreinoService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()
  })

  it("should return workout checkin exercises ordered by treinoDiaExercicio.ordem", async () => {
    prismaMock.aluno.findUnique.mockResolvedValue({
      id: "aluno-1",
      userId: "user-1",
    })
    prismaMock.treinoCheckin.findMany.mockResolvedValue([
      {
        id: "check-1",
        exercicios: [
          {
            id: "exercise-2",
            treinoDiaExercicio: { ordem: 2 },
            exercicio: { nome: "Remada" },
          },
          {
            id: "exercise-1",
            treinoDiaExercicio: { ordem: 1 },
            exercicio: { nome: "Supino" },
          },
        ],
      },
    ])

    const PlanoTreinoService = await importService()
    const service = new PlanoTreinoService()

    const result = await service.listCheckinsByAluno(
      { userId: "user-1", role: "ALUNO" as never },
      "aluno-1",
      20,
    )

    expect(result[0].exercicios.map((item) => item.treinoDiaExercicio.ordem)).toEqual([1, 2])
  })

  it("should keep canonical order when finalizing a workout checkin", async () => {
    prismaMock.treinoCheckin.findUnique.mockResolvedValue({
      id: "check-1",
      status: "INICIADO",
      aluno: { userId: "user-1" },
      exercicios: [],
    })
    prismaMock.treinoCheckin.update.mockResolvedValue({
      id: "check-1",
      treinoDia: { titulo: "Treino A" },
      exercicios: [
        {
          id: "exercise-3",
          treinoDiaExercicio: { ordem: 3 },
          exercicio: { nome: "Triceps" },
        },
        {
          id: "exercise-1",
          treinoDiaExercicio: { ordem: 1 },
          exercicio: { nome: "Supino" },
        },
        {
          id: "exercise-2",
          treinoDiaExercicio: { ordem: 2 },
          exercicio: { nome: "Crucifixo" },
        },
      ],
    })

    const PlanoTreinoService = await importService()
    const service = new PlanoTreinoService()

    const result = await service.finalizeCheckin(
      { userId: "user-1", role: "ALUNO" as never },
      { checkinId: "check-1" },
    )

    expect(result.exercicios.map((item) => item.treinoDiaExercicio.ordem)).toEqual([1, 2, 3])
  })
})
