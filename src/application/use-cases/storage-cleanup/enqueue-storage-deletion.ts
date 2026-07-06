import { StorageCleanupRepository } from "@/application/repositories/storage-cleanup-repository"
import {
  StorageDeletionCategory,
  StorageResourceType,
} from "@/domain/entities/storage-cleanup"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"

export interface StorageDeletionTarget {
  resourceCategory: StorageDeletionCategory
  resourceType: StorageResourceType
  publicId: string
  relatedRecordId?: string | null
  relatedParentId?: string | null
}

export class EnqueueStorageDeletionUseCase {
  constructor(private storageCleanupRepository: StorageCleanupRepository) {}

  async enqueue(target: StorageDeletionTarget): Promise<void> {
    await this.storageCleanupRepository.createPending(target)
  }

  async deleteNowOrEnqueue(target: StorageDeletionTarget): Promise<void> {
    try {
      await CloudinaryService.deleteFile(
        target.publicId,
        target.resourceType === StorageResourceType.RAW ? "raw" : "image",
      )
    } catch {
      await this.enqueue(target).catch(() => {
        console.error("Falha ao registrar limpeza pendente de storage")
      })
    }
  }
}
