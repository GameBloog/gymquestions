import { describe, expect, it, vi, afterEach } from "vitest"
import { UploadArquivoAlunoUseCase } from "../../../src/application/use-cases/arquivo-aluno/upload-arquivo-aluno"
import { EnqueueStorageDeletionUseCase } from "../../../src/application/use-cases/storage-cleanup/enqueue-storage-deletion"
import { ArquivoAlunoRepository } from "../../../src/application/repositories/arquivo-aluno-repository"
import { AlunoRepository } from "../../../src/application/repositories/aluno-repository"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { TipoArquivo } from "../../../src/domain/entities/arquivo-aluno"
import { InMemoryStorageCleanupRepository } from "../../repositories/in-memory-storage-cleanup-repository"

describe("UploadArquivoAlunoUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("compensates uploaded PDF and preserves original create failure", async () => {
    const originalError = new Error("database create failed")
    const arquivoRepository = {
      create: vi.fn().mockRejectedValue(originalError),
    } as unknown as ArquivoAlunoRepository
    const alunoRepository = {
      findById: vi.fn().mockResolvedValue({ id: "aluno-1" }),
    } as unknown as AlunoRepository
    const cleanupRepository = new InMemoryStorageCleanupRepository()
    const useCase = new UploadArquivoAlunoUseCase(
      arquivoRepository,
      alunoRepository,
      new EnqueueStorageDeletionUseCase(cleanupRepository),
    )

    vi.spyOn(CloudinaryService, "uploadPDF").mockResolvedValue({
      url: "https://cdn.test/file.pdf",
      publicId: "gym/private/file",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("deleted")

    await expect(
      useCase.execute({
        alunoId: "aluno-1",
        professorId: "prof-1",
        tipo: TipoArquivo.TREINO,
        titulo: "Treino",
        buffer: Buffer.from("pdf"),
      }),
    ).rejects.toBe(originalError)

    expect(CloudinaryService.deleteFile).toHaveBeenCalledWith(
      "gym/private/file",
      "raw",
    )
    expect(cleanupRepository.pending).toHaveLength(0)
  })

  it("creates pending cleanup when compensation delete fails", async () => {
    const arquivoRepository = {
      create: vi.fn().mockRejectedValue(new Error("database create failed")),
    } as unknown as ArquivoAlunoRepository
    const alunoRepository = {
      findById: vi.fn().mockResolvedValue({ id: "aluno-1" }),
    } as unknown as AlunoRepository
    const cleanupRepository = new InMemoryStorageCleanupRepository()
    const useCase = new UploadArquivoAlunoUseCase(
      arquivoRepository,
      alunoRepository,
      new EnqueueStorageDeletionUseCase(cleanupRepository),
    )

    vi.spyOn(CloudinaryService, "uploadPDF").mockResolvedValue({
      url: "https://cdn.test/file.pdf",
      publicId: "gym/private/file",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockRejectedValue(
      new Error("provider unavailable"),
    )

    await expect(
      useCase.execute({
        alunoId: "aluno-1",
        professorId: "prof-1",
        tipo: TipoArquivo.DIETA,
        titulo: "Dieta",
        buffer: Buffer.from("pdf"),
      }),
    ).rejects.toThrow("database create failed")

    expect(cleanupRepository.pending).toHaveLength(1)
    expect(cleanupRepository.pending[0].publicId).toBe("gym/private/file")
  })
})
