import { StorageCleanupRepository } from "@/application/repositories/storage-cleanup-repository"
import {
  StorageCleanupAttemptOutcome,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
  StorageResourceType,
} from "@/domain/entities/storage-cleanup"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"
import {
  classifyStorageDeletionError,
  getNextStorageDeletionAttemptAt,
  MAX_STORAGE_DELETION_ATTEMPTS,
} from "./storage-cleanup-errors"
import { StorageReferenceChecker } from "./storage-reference-checker"

export class ProcessStorageDeletionsUseCase {
  constructor(
    private storageCleanupRepository: StorageCleanupRepository,
    private referenceChecker = new StorageReferenceChecker(),
  ) {}

  async execute(limit = 25): Promise<{ processed: number }> {
    const due = await this.storageCleanupRepository.findDue(limit)
    let processed = 0

    for (const item of due) {
      processed += 1

      try {
        const result = await CloudinaryService.deleteFile(
          item.publicId,
          item.resourceType === StorageResourceType.RAW ? "raw" : "image",
        )

        if (result === "not_found") {
          const hasActiveReference = await this.referenceChecker.hasActiveReference(
            item.publicId,
            item.resourceType,
          )

          if (hasActiveReference) {
            await this.recordFailure(
              item.id,
              item.attemptCount + 1,
              StorageDeletionErrorCategory.NOT_FOUND_ACTIVE_REFERENCE,
            )
            continue
          }

          await this.storageCleanupRepository.markCompleted(item.id)
          continue
        }

        await this.storageCleanupRepository.markCompleted(item.id)
      } catch (error) {
        await this.recordFailure(
          item.id,
          item.attemptCount + 1,
          classifyStorageDeletionError(error),
        )
      }
    }

    return { processed }
  }

  private async recordFailure(
    id: string,
    nextAttemptNumber: number,
    errorCategory: StorageDeletionErrorCategory,
  ) {
    const permanentFailure = nextAttemptNumber >= MAX_STORAGE_DELETION_ATTEMPTS

    await this.storageCleanupRepository.recordAttempt({
      id,
      outcome: permanentFailure
        ? StorageCleanupAttemptOutcome.PERMANENT_FAILURE
        : StorageCleanupAttemptOutcome.RETRYABLE_FAILURE,
      errorCategory,
      permanentFailure,
      nextAttemptAt: getNextStorageDeletionAttemptAt(nextAttemptNumber),
    })
  }
}
