import { FotoShapeRepository } from "@/application/repositories/foto-shape-repository"
import { AppError } from "@/shared/errors/app-error"
import { EnqueueStorageDeletionUseCase } from "../storage-cleanup/enqueue-storage-deletion"
import {
  StorageDeletionCategory,
  StorageResourceType,
} from "@/domain/entities/storage-cleanup"

export class DeleteFotoShapeUseCase {
  constructor(
    private fotoShapeRepository: FotoShapeRepository,
    private storageDeletion?: EnqueueStorageDeletionUseCase,
  ) {}

  async execute(id: string): Promise<void> {
    const foto = await this.fotoShapeRepository.findById(id)
    if (!foto) {
      throw new AppError("Foto não encontrada", 404)
    }

    await this.fotoShapeRepository.delete(id)

    await this.storageDeletion?.deleteNowOrEnqueue({
      resourceCategory: StorageDeletionCategory.EVOLUTION_PHOTO,
      resourceType: StorageResourceType.IMAGE,
      publicId: foto.publicId,
      relatedRecordId: foto.id,
      relatedParentId: foto.alunoId,
    })
  }
}
