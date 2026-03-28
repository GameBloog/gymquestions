import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  alimento: {
    findMany: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

const buildPrismaMock = (): PrismaMock => ({
  alimento: {
    findMany: vi.fn(),
  },
})

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/application/use-cases/dieta/alimento-service"
  )

  return module.AlimentoService
}

describe("AlimentoService catalog access", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()
  })

  it("should list professor-created foods for any professor", async () => {
    prismaMock.alimento.findMany.mockResolvedValue([{ id: "food-1", origem: "PROFESSOR" }])

    const AlimentoService = await importService()
    const service = new AlimentoService()

    const result = await service.listAlimentos(
      { userId: "user-prof", role: "PROFESSOR" as never },
      { q: "banana" },
    )

    expect(result).toEqual([{ id: "food-1", origem: "PROFESSOR" }])
    expect(prismaMock.alimento.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            nome: {
              contains: "banana",
              mode: "insensitive",
            },
          },
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
