import { describe, expect, it, vi, afterEach } from "vitest"
import { UploadFotoShapeUseCase } from "../../../src/application/use-cases/foto-shape/upload-foto-shape"
import { EnqueueStorageDeletionUseCase } from "../../../src/application/use-cases/storage-cleanup/enqueue-storage-deletion"
import { FotoShapeRepository } from "../../../src/application/repositories/foto-shape-repository"
import { AlunoRepository } from "../../../src/application/repositories/aluno-repository"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { InMemoryStorageCleanupRepository } from "../../repositories/in-memory-storage-cleanup-repository"

describe("UploadFotoShapeUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("compensates uploaded photo and preserves original create failure", async () => {
    const originalError = new Error("database create failed")
    const fotoRepository = {
      create: vi.fn().mockRejectedValue(originalError),
    } as unknown as FotoShapeRepository
    const alunoRepository = {
      findById: vi.fn().mockResolvedValue({ id: "aluno-1" }),
    } as unknown as AlunoRepository
    const cleanupRepository = new InMemoryStorageCleanupRepository()
    const useCase = new UploadFotoShapeUseCase(
      fotoRepository,
      alunoRepository,
      new EnqueueStorageDeletionUseCase(cleanupRepository),
    )

    vi.spyOn(CloudinaryService, "uploadFotoShape").mockResolvedValue({
      url: "https://cdn.test/photo.jpg",
      publicId: "gym/private/photo",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("deleted")

    await expect(
      useCase.execute({
        alunoId: "aluno-1",
        buffer: Buffer.from("photo"),
      }),
    ).rejects.toBe(originalError)

    expect(CloudinaryService.deleteFile).toHaveBeenCalledWith(
      "gym/private/photo",
      "image",
    )
    expect(cleanupRepository.pending).toHaveLength(0)
  })
})
