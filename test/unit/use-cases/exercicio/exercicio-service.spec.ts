import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  exercicio: {
    findMany: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

const buildPrismaMock = (): PrismaMock => ({
  exercicio: {
    findMany: vi.fn(),
  },
})

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/application/use-cases/exercicio/exercicio-service"
  )

  return module.ExercicioService
}

describe("ExercicioService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()
  })

  it("should list professor-created exercises for any professor", async () => {
    prismaMock.exercicio.findMany.mockResolvedValue([{ id: "ex-1", origem: "PROFESSOR" }])

    const ExercicioService = await importService()
    const service = new ExercicioService()

    const result = await service.listExercicios(
      { userId: "user-prof", role: "PROFESSOR" as never },
      { q: "supino" },
    )

    expect(result).toEqual([{ id: "ex-1", origem: "PROFESSOR" }])
    expect(prismaMock.exercicio.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            nome: {
              contains: "supino",
              mode: "insensitive",
            },
          },
          {},
          {
            OR: [
              { origem: "SISTEMA" },
              { origem: "EXTERNO" },
              { origem: "PROFESSOR" },
            ],
          },
        ],
      },
      orderBy: [{ nome: "asc" }],
    })
  })
})
