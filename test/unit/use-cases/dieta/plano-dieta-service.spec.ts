import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  aluno: {
    findUnique: ReturnType<typeof vi.fn>
  }
  dietaDia: {
    findUnique: ReturnType<typeof vi.fn>
  }
  dietaCheckin: {
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

const buildPrismaMock = (): PrismaMock => ({
  aluno: {
    findUnique: vi.fn(),
  },
  dietaDia: {
    findUnique: vi.fn(),
  },
  dietaCheckin: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
})

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/application/use-cases/dieta/plano-dieta-service"
  )

  return module.PlanoDietaService
}

describe("PlanoDietaService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()
  })

  it("should return existing diet checkin meals ordered by dietaRefeicao.ordem", async () => {
    prismaMock.aluno.findUnique.mockResolvedValue({
      id: "aluno-1",
      userId: "user-1",
    })
    prismaMock.dietaDia.findUnique.mockResolvedValue({
      id: "dia-1",
      planoDieta: {
        id: "plano-1",
        alunoId: "aluno-1",
        professorId: "prof-1",
        ativo: true,
      },
      refeicoes: [{ id: "meal-1" }, { id: "meal-2" }],
    })
    prismaMock.dietaCheckin.findFirst.mockResolvedValue({
      id: "check-1",
      refeicoes: [
        {
          id: "refeicao-2",
          dietaRefeicaoId: "meal-2",
          dietaRefeicao: {
            ordem: 2,
            itens: [{ ordem: 2 }, { ordem: 1 }],
          },
        },
        {
          id: "refeicao-1",
          dietaRefeicaoId: "meal-1",
          dietaRefeicao: {
            ordem: 1,
            itens: [{ ordem: 3 }, { ordem: 1 }],
          },
        },
      ],
    })

    const PlanoDietaService = await importService()
    const service = new PlanoDietaService()

    const result = await service.startCheckin(
      { userId: "user-1", role: "ALUNO" as never },
      { dietaDiaId: "dia-1" },
    )

    expect(result.refeicoes.map((item) => item.dietaRefeicao.ordem)).toEqual([1, 2])
    expect(result.refeicoes[0].dietaRefeicao.itens.map((item) => item.ordem)).toEqual([1, 3])
  })

  it("should keep canonical order when listing diet checkins", async () => {
    prismaMock.aluno.findUnique.mockResolvedValue({
      id: "aluno-1",
      userId: "user-1",
    })
    prismaMock.dietaCheckin.findMany.mockResolvedValue([
      {
        id: "check-1",
        refeicoes: [
          {
            id: "refeicao-3",
            dietaRefeicao: {
              ordem: 3,
              itens: [{ ordem: 2 }, { ordem: 1 }],
            },
          },
          {
            id: "refeicao-1",
            dietaRefeicao: {
              ordem: 1,
              itens: [{ ordem: 4 }, { ordem: 2 }],
            },
          },
          {
            id: "refeicao-2",
            dietaRefeicao: {
              ordem: 2,
              itens: [{ ordem: 3 }, { ordem: 1 }],
            },
          },
        ],
      },
    ])

    const PlanoDietaService = await importService()
    const service = new PlanoDietaService()

    const result = await service.listCheckinsByAluno(
      { userId: "user-1", role: "ALUNO" as never },
      "aluno-1",
      20,
    )

    expect(result[0].refeicoes.map((item) => item.dietaRefeicao.ordem)).toEqual([1, 2, 3])
    expect(result[0].refeicoes[2].dietaRefeicao.itens.map((item) => item.ordem)).toEqual([1, 2])
  })
})
