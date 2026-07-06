import { ArquivoAlunoRepository } from "@/application/repositories/arquivo-aluno-repository"
import { AppError } from "@/shared/errors/app-error"
import { EnqueueStorageDeletionUseCase } from "../storage-cleanup/enqueue-storage-deletion"
import {
  StorageDeletionCategory,
  StorageResourceType,
} from "@/domain/entities/storage-cleanup"

export class DeleteArquivoAlunoUseCase {
  constructor(
    private arquivoAlunoRepository: ArquivoAlunoRepository,
    private storageDeletion?: EnqueueStorageDeletionUseCase,
  ) {}

  async execute(id: string): Promise<void> {
    const arquivo = await this.arquivoAlunoRepository.findById(id)
    if (!arquivo) {
      throw new AppError("Arquivo não encontrado", 404)
    }

    await this.arquivoAlunoRepository.delete(id)

    await this.storageDeletion?.deleteNowOrEnqueue({
      resourceCategory: StorageDeletionCategory.STUDENT_DOCUMENT,
      resourceType: StorageResourceType.RAW,
      publicId: arquivo.publicId,
      relatedRecordId: arquivo.id,
      relatedParentId: arquivo.alunoId,
    })
  }
}
