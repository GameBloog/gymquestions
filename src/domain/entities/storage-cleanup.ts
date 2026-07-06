import {
  StorageCleanupAttemptOutcome,
  StorageDeletionCategory,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
  StorageResourceType,
} from "@prisma/client"

export {
  StorageCleanupAttemptOutcome,
  StorageDeletionCategory,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
  StorageResourceType,
}

export interface PendingStorageDeletion {
  id: string
  resourceCategory: StorageDeletionCategory
  resourceType: StorageResourceType
  publicId: string
  relatedRecordId?: string | null
  relatedParentId?: string | null
  status: StorageDeletionStatus
  attemptCount: number
  nextAttemptAt: Date
  lastAttemptedAt?: Date | null
  lastErrorCategory?: StorageDeletionErrorCategory | null
  createdAt: Date
  updatedAt: Date
}

export interface StorageCleanupAttempt {
  id: string
  pendingDeletionId: string
  attemptNumber: number
  outcome: StorageCleanupAttemptOutcome
  errorCategory?: StorageDeletionErrorCategory | null
  attemptedAt: Date
}

export interface CreatePendingStorageDeletionInput {
  resourceCategory: StorageDeletionCategory
  resourceType: StorageResourceType
  publicId: string
  relatedRecordId?: string | null
  relatedParentId?: string | null
}
