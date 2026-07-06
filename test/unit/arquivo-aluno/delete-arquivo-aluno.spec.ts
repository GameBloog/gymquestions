import { describe, expect, it, vi, afterEach } from "vitest"
import { DeleteArquivoAlunoUseCase } from "../../../src/application/use-cases/arquivo-aluno/delete-arquivo-aluno"
import { EnqueueStorageDeletionUseCase } from "../../../src/application/use-cases/storage-cleanup/enqueue-storage-deletion"
import { ArquivoAlunoRepository } from "../../../src/application/repositories/arquivo-aluno-repository"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { InMemoryStorageCleanupRepository } from "../../repositories/in-memory-storage-cleanup-repository"

describe("DeleteArquivoAlunoUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("deletes the product record before remote deletion and tracks remote failure", async () => {
    const calls: string[] = []
    const arquivoRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "arquivo-1",
        alunoId: "aluno-1",
        publicId: "gym/private/file",
      }),
      delete: vi.fn().mockImplementation(async () => {
        calls.push("record-delete")
      }),
    } as unknown as ArquivoAlunoRepository
    const cleanupRepository = new InMemoryStorageCleanupRepository()
    const useCase = new DeleteArquivoAlunoUseCase(
      arquivoRepository,
      new EnqueueStorageDeletionUseCase(cleanupRepository),
    )

    vi.spyOn(CloudinaryService, "deleteFile").mockImplementation(async () => {
      calls.push("remote-delete")
      throw new Error("provider unavailable")
    })

    await useCase.execute("arquivo-1")

    expect(calls).toEqual(["record-delete", "remote-delete"])
    expect(cleanupRepository.pending).toHaveLength(1)
    expect(cleanupRepository.pending[0].publicId).toBe("gym/private/file")
  })
})
