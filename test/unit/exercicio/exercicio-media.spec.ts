import { afterEach, describe, expect, it, vi } from "vitest"
import { ExercicioService } from "../../../src/application/use-cases/exercicio/exercicio-service"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { prisma } from "../../../src/infraestructure/database/prisma"
import { UserRole } from "../../../src/domain/entities/user"

const baseExercise = {
  id: "exercise-1",
  nome: "Supino",
  descricao: null,
  grupamentoMuscular: "PEITO",
  executionGifUrl: "https://cdn.test/old.gif",
  executionGifPublicId: "old-public-id",
  equipmentImageUrl: null,
  equipmentImagePublicId: null,
  origem: "SISTEMA",
  externalId: null,
  externalSource: null,
  professorId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("ExercicioService media", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("preserves previous media and deletes new upload when optimistic update fails", async () => {
    vi.spyOn(prisma.exercicio, "findUnique")
      .mockResolvedValueOnce(baseExercise as any)
    vi.spyOn(prisma.exercicio, "updateMany").mockResolvedValue({ count: 0 } as any)
    vi.spyOn(CloudinaryService, "uploadExerciseExecutionGif").mockResolvedValue({
      url: "https://cdn.test/new.gif",
      publicId: "new-public-id",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("deleted")

    await expect(
      new ExercicioService().uploadExerciseMedia(
        { userId: "admin-1", role: UserRole.ADMIN },
        {
          exercicioId: "exercise-1",
          kind: "execucao",
          buffer: Buffer.from("gif"),
          mimetype: "image/gif",
        },
      ),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(CloudinaryService.deleteFile).toHaveBeenCalledWith(
      "new-public-id",
      "image",
    )
    expect(CloudinaryService.deleteFile).not.toHaveBeenCalledWith(
      "old-public-id",
      "image",
    )
  })

  it("saves new media before deleting previous media", async () => {
    const calls: string[] = []
    vi.spyOn(prisma.exercicio, "findUnique")
      .mockResolvedValueOnce(baseExercise as any)
      .mockResolvedValueOnce({
        ...baseExercise,
        executionGifUrl: "https://cdn.test/new.gif",
        executionGifPublicId: "new-public-id",
      } as any)
    vi.spyOn(prisma.exercicio, "updateMany").mockImplementation(async () => {
      calls.push("record-update")
      return { count: 1 } as any
    })
    vi.spyOn(CloudinaryService, "uploadExerciseExecutionGif").mockResolvedValue({
      url: "https://cdn.test/new.gif",
      publicId: "new-public-id",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockImplementation(async () => {
      calls.push("old-delete")
      return "deleted"
    })

    const result = await new ExercicioService().uploadExerciseMedia(
      { userId: "admin-1", role: UserRole.ADMIN },
      {
        exercicioId: "exercise-1",
        kind: "execucao",
        buffer: Buffer.from("gif"),
        mimetype: "image/gif",
      },
    )

    expect(result.executionGifPublicId).toBe("new-public-id")
    expect(calls).toEqual(["record-update", "old-delete"])
  })

  it("does not delete referenced media when clear update fails", async () => {
    vi.spyOn(prisma.exercicio, "findUnique").mockResolvedValue(
      baseExercise as any,
    )
    vi.spyOn(prisma.exercicio, "update").mockRejectedValue(
      new Error("database update failed"),
    )
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("deleted")

    await expect(
      new ExercicioService().clearExerciseMedia(
        { userId: "admin-1", role: UserRole.ADMIN },
        { exercicioId: "exercise-1", kind: "execucao" },
      ),
    ).rejects.toThrow("database update failed")

    expect(CloudinaryService.deleteFile).not.toHaveBeenCalled()
  })
})
