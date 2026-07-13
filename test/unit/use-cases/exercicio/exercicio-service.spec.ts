import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaMock {
  professor: {
    findUnique: ReturnType<typeof vi.fn>
  }
  exercicio: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock
const cloudinaryServiceMock = {
  uploadExerciseExecutionGif: vi.fn(),
  uploadExerciseEquipmentImage: vi.fn(),
  deleteFile: vi.fn(),
}

const buildPrismaMock = (): PrismaMock => ({
  professor: {
    findUnique: vi.fn(),
  },
  exercicio: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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
    prismaMock.exercicio.findMany.mockResolvedValue([
      { id: "ex-1", origem: "PROFESSOR" },
    ])

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
    prismaMock.exercicio.findUnique
      .mockResolvedValueOnce({
        id: "ex-1",
        origem: "PROFESSOR",
        professorId: "prof-1",
        executionGifPublicId: "old-public-id",
      })
      .mockResolvedValueOnce({
        id: "ex-1",
        executionGifUrl: "https://cdn.example.com/new.gif",
        executionGifPublicId: "new-public-id",
      })
    prismaMock.professor.findUnique.mockResolvedValue({ id: "prof-1" })
    prismaMock.exercicio.updateMany.mockResolvedValue({ count: 1 })
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

    expect(
      cloudinaryServiceMock.uploadExerciseExecutionGif,
    ).toHaveBeenCalled()
    expect(cloudinaryServiceMock.deleteFile).toHaveBeenCalledWith(
      "old-public-id",
      "image",
    )
    expect(prismaMock.exercicio.updateMany).toHaveBeenCalledWith({
      where: { id: "ex-1", executionGifPublicId: "old-public-id" },
      data: {
        executionGifUrl: "https://cdn.example.com/new.gif",
        executionGifPublicId: "new-public-id",
      },
    })
    expect(result).toEqual({
      id: "ex-1",
      executionGifUrl: "https://cdn.example.com/new.gif",
      executionGifPublicId: "new-public-id",
    })
  })

  it("should clear equipment media and remove stored asset", async () => {
    prismaMock.exercicio.findUnique.mockResolvedValue({
      id: "ex-2",
      origem: "PROFESSOR",
      professorId: "prof-1",
      equipmentImagePublicId: "equipment-public-id",
    })
    prismaMock.professor.findUnique.mockResolvedValue({ id: "prof-1" })
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

  it("should reject professor upload for shared system exercise", async () => {
    prismaMock.exercicio.findUnique.mockResolvedValue({
      id: "ex-system",
      origem: "SISTEMA",
      professorId: null,
      executionGifPublicId: null,
    })
    prismaMock.professor.findUnique.mockResolvedValue({ id: "prof-1" })

    const ExercicioService = await importService()
    const service = new ExercicioService()

    await expect(
      service.uploadExerciseMedia(
        { userId: "user-prof", role: "PROFESSOR" as never },
        {
          exercicioId: "ex-system",
          kind: "execucao",
          buffer: Buffer.from("gif"),
          mimetype: "image/gif",
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(
      cloudinaryServiceMock.uploadExerciseExecutionGif,
    ).not.toHaveBeenCalled()
    expect(prismaMock.exercicio.updateMany).not.toHaveBeenCalled()
  })

  it("should reject professor clearing another professor exercise media", async () => {
    prismaMock.exercicio.findUnique.mockResolvedValue({
      id: "ex-other",
      origem: "PROFESSOR",
      professorId: "other-prof",
      equipmentImagePublicId: "equipment-public-id",
    })
    prismaMock.professor.findUnique.mockResolvedValue({ id: "prof-1" })

    const ExercicioService = await importService()
    const service = new ExercicioService()

    await expect(
      service.clearExerciseMedia(
        { userId: "user-prof", role: "PROFESSOR" as never },
        {
          exercicioId: "ex-other",
          kind: "aparelho",
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(prismaMock.exercicio.update).not.toHaveBeenCalled()
    expect(cloudinaryServiceMock.deleteFile).not.toHaveBeenCalled()
  })
})
