import { describe, expect, it, vi, afterEach } from "vitest"
import { DeleteFotoShapeUseCase } from "../../../src/application/use-cases/foto-shape/delete-foto-shape"
import { EnqueueStorageDeletionUseCase } from "../../../src/application/use-cases/storage-cleanup/enqueue-storage-deletion"
import { FotoShapeRepository } from "../../../src/application/repositories/foto-shape-repository"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { InMemoryStorageCleanupRepository } from "../../repositories/in-memory-storage-cleanup-repository"

describe("DeleteFotoShapeUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("deletes the product record before remote deletion and tracks remote failure", async () => {
    const calls: string[] = []
    const fotoRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "foto-1",
        alunoId: "aluno-1",
        publicId: "gym/private/photo",
      }),
      delete: vi.fn().mockImplementation(async () => {
        calls.push("record-delete")
      }),
    } as unknown as FotoShapeRepository
    const cleanupRepository = new InMemoryStorageCleanupRepository()
    const useCase = new DeleteFotoShapeUseCase(
      fotoRepository,
      new EnqueueStorageDeletionUseCase(cleanupRepository),
    )

    vi.spyOn(CloudinaryService, "deleteFile").mockImplementation(async () => {
      calls.push("remote-delete")
      throw new Error("provider unavailable")
    })

    await useCase.execute("foto-1")

    expect(calls).toEqual(["record-delete", "remote-delete"])
    expect(cleanupRepository.pending).toHaveLength(1)
    expect(cleanupRepository.pending[0].publicId).toBe("gym/private/photo")
  })
})
