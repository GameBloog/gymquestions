import {
  CreatePendingStorageDeletionInput,
  PendingStorageDeletion,
  StorageCleanupAttemptOutcome,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
} from "@/domain/entities/storage-cleanup"

export interface StorageCleanupRepository {
  createPending(
    input: CreatePendingStorageDeletionInput,
  ): Promise<PendingStorageDeletion>
  findPendingByPublicId(
    publicId: string,
    resourceType: "IMAGE" | "RAW",
  ): Promise<PendingStorageDeletion | null>
  findDue(limit: number, now?: Date): Promise<PendingStorageDeletion[]>
  listByStatus(
    status?: StorageDeletionStatus,
  ): Promise<PendingStorageDeletion[]>
  markCompleted(id: string): Promise<void>
  recordAttempt(input: {
    id: string
    outcome: StorageCleanupAttemptOutcome
    errorCategory?: StorageDeletionErrorCategory
    nextAttemptAt?: Date
    permanentFailure?: boolean
  }): Promise<void>
}
