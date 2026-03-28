import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  professor: {
    findUnique: ReturnType<typeof vi.fn>
  }
  exercicio: {
    findMany: ReturnType<typeof vi.fn>
  }
  treinoModelo: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

const buildPrismaMock = (): PrismaMock => ({
  professor: {
    findUnique: vi.fn(),
  },
  exercicio: {
    findMany: vi.fn(),
  },
  treinoModelo: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
})

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/modules/treino-modelos/application/treino-modelo-service"
  )

  return module.TreinoModeloService
}

describe("TreinoModeloService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()
  })

  it("should create a workout template for the authenticated professor", async () => {
    prismaMock.professor.findUnique.mockResolvedValue({ id: "prof-1" })
    prismaMock.exercicio.findMany.mockResolvedValue([{ id: "ex-1" }])
    prismaMock.treinoModelo.create.mockResolvedValue({ id: "modelo-1" })

    const TreinoModeloService = await importService()
    const service = new TreinoModeloService()

    const result = await service.create(
      { userId: "user-1", role: "PROFESSOR" as never },
      {
        nome: "Molde A",
        dias: [
          {
            titulo: "Treino A",
            ordem: 1,
            exercicios: [
              {
                exercicioId: "ex-1",
                ordem: 1,
              },
            ],
          },
        ],
      },
    )

    expect(result).toEqual({ id: "modelo-1" })
    expect(prismaMock.treinoModelo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          professorId: "prof-1",
          nome: "Molde A",
        }),
      }),
    )
  })

  it("should list only templates from the authenticated professor", async () => {
    prismaMock.professor.findUnique.mockResolvedValue({ id: "prof-1" })
    prismaMock.treinoModelo.findMany.mockResolvedValue([{ id: "modelo-1" }])

    const TreinoModeloService = await importService()
    const service = new TreinoModeloService()

    const result = await service.list({
      userId: "user-1",
      role: "PROFESSOR" as never,
    })

    expect(result).toEqual([{ id: "modelo-1" }])
    expect(prismaMock.treinoModelo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { professorId: "prof-1" },
      }),
    )
  })
})
