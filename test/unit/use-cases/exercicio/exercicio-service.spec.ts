import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  exercicio: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock
const cloudinaryServiceMock = {
  uploadExerciseExecutionGif: vi.fn(),
  uploadExerciseEquipmentImage: vi.fn(),
  deleteFile: vi.fn(),
}

const buildPrismaMock = (): PrismaMock => ({
  exercicio: {
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
  vi.doMock("@/infraestructure/storage/cloudinary.service", () => ({
    CloudinaryService: cloudinaryServiceMock,
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
    cloudinaryServiceMock.uploadExerciseExecutionGif.mockReset()
    cloudinaryServiceMock.uploadExerciseEquipmentImage.mockReset()
    cloudinaryServiceMock.deleteFile.mockReset()
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

  it("should upload execution media and persist returned asset", async () => {
    prismaMock.exercicio.findUnique.mockResolvedValue({
      id: "ex-1",
      executionGifPublicId: "old-public-id",
    })
    prismaMock.exercicio.update.mockResolvedValue({
      id: "ex-1",
      executionGifUrl: "https://cdn.example.com/new.gif",
    })
    cloudinaryServiceMock.uploadExerciseExecutionGif.mockResolvedValue({
      url: "https://cdn.example.com/new.gif",
      publicId: "new-public-id",
    })

    const ExercicioService = await importService()
    const service = new ExercicioService()

    const result = await service.uploadExerciseMedia(
      { userId: "user-prof", role: "PROFESSOR" as never },
      {
        exercicioId: "ex-1",
        kind: "execucao",
        buffer: Buffer.from("gif"),
        mimetype: "image/gif",
      },
    )

    expect(cloudinaryServiceMock.uploadExerciseExecutionGif).toHaveBeenCalled()
    expect(cloudinaryServiceMock.deleteFile).toHaveBeenCalledWith(
      "old-public-id",
      "image",
    )
    expect(prismaMock.exercicio.update).toHaveBeenCalledWith({
      where: { id: "ex-1" },
      data: {
        executionGifUrl: "https://cdn.example.com/new.gif",
        executionGifPublicId: "new-public-id",
      },
    })
    expect(result).toEqual({
      id: "ex-1",
      executionGifUrl: "https://cdn.example.com/new.gif",
    })
  })

  it("should clear equipment media and remove stored asset", async () => {
    prismaMock.exercicio.findUnique.mockResolvedValue({
      id: "ex-2",
      equipmentImagePublicId: "equipment-public-id",
    })
    prismaMock.exercicio.update.mockResolvedValue({
      id: "ex-2",
      equipmentImageUrl: null,
      equipmentImagePublicId: null,
    })

    const ExercicioService = await importService()
    const service = new ExercicioService()

    const result = await service.clearExerciseMedia(
      { userId: "user-prof", role: "PROFESSOR" as never },
      {
        exercicioId: "ex-2",
        kind: "aparelho",
      },
    )

    expect(cloudinaryServiceMock.deleteFile).toHaveBeenCalledWith(
      "equipment-public-id",
      "image",
    )
    expect(prismaMock.exercicio.update).toHaveBeenCalledWith({
      where: { id: "ex-2" },
      data: {
        equipmentImageUrl: null,
        equipmentImagePublicId: null,
      },
    })
    expect(result).toEqual({
      id: "ex-2",
      equipmentImageUrl: null,
      equipmentImagePublicId: null,
    })
  })
})
