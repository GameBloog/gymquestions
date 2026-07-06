import { randomUUID } from "crypto"
import { StorageCleanupRepository } from "../../src/application/repositories/storage-cleanup-repository"
import {
  CreatePendingStorageDeletionInput,
  PendingStorageDeletion,
  StorageCleanupAttempt,
  StorageCleanupAttemptOutcome,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
} from "../../src/domain/entities/storage-cleanup"

export class InMemoryStorageCleanupRepository
  implements StorageCleanupRepository
{
  public pending: PendingStorageDeletion[] = []
  public attempts: StorageCleanupAttempt[] = []

  async createPending(
    input: CreatePendingStorageDeletionInput,
  ): Promise<PendingStorageDeletion> {
    const existing = this.pending.find(
      (item) =>
        item.publicId === input.publicId &&
        item.resourceType === input.resourceType &&
        ["PENDING", "RETRYING"].includes(item.status),
    )

    if (existing) {
      return existing
    }

    const now = new Date()
    const item: PendingStorageDeletion = {
      id: randomUUID(),
      resourceCategory: input.resourceCategory,
      resourceType: input.resourceType,
      publicId: input.publicId,
      relatedRecordId: input.relatedRecordId ?? null,
      relatedParentId: input.relatedParentId ?? null,
      status: StorageDeletionStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: now,
      lastAttemptedAt: null,
      lastErrorCategory: null,
      createdAt: now,
      updatedAt: now,
    }

    this.pending.push(item)
    return item
  }

  async findPendingByPublicId(
    publicId: string,
    resourceType: "IMAGE" | "RAW",
  ): Promise<PendingStorageDeletion | null> {
    return (
      this.pending.find(
        (item) =>
          item.publicId === publicId &&
          item.resourceType === resourceType &&
          ["PENDING", "RETRYING"].includes(item.status),
      ) ?? null
    )
  }

  async findDue(limit: number, now = new Date()): Promise<PendingStorageDeletion[]> {
    return this.pending
      .filter(
        (item) =>
          ["PENDING", "RETRYING"].includes(item.status) &&
          item.nextAttemptAt <= now,
      )
      .slice(0, limit)
  }

  async listByStatus(
    status?: StorageDeletionStatus,
  ): Promise<PendingStorageDeletion[]> {
    return status
      ? this.pending.filter((item) => item.status === status)
      : [...this.pending]
  }

  async markCompleted(id: string): Promise<void> {
    const item = this.pending.find((pending) => pending.id === id)
    if (!item) return
    item.status = StorageDeletionStatus.COMPLETED
    item.lastAttemptedAt = new Date()
    item.lastErrorCategory = null
    item.updatedAt = new Date()
  }

  async recordAttempt(input: {
    id: string
    outcome: StorageCleanupAttemptOutcome
    errorCategory?: StorageDeletionErrorCategory
    nextAttemptAt?: Date
    permanentFailure?: boolean
  }): Promise<void> {
    const item = this.pending.find((pending) => pending.id === input.id)
    if (!item) return

    const attemptNumber = item.attemptCount + 1
    this.attempts.push({
      id: randomUUID(),
      pendingDeletionId: input.id,
      attemptNumber,
      outcome: input.outcome,
      errorCategory: input.errorCategory ?? null,
      attemptedAt: new Date(),
    })

    item.attemptCount = attemptNumber
    item.status = input.permanentFailure
      ? StorageDeletionStatus.PERMANENT_FAILURE
      : StorageDeletionStatus.RETRYING
    item.nextAttemptAt = input.nextAttemptAt ?? item.nextAttemptAt
    item.lastAttemptedAt = new Date()
    item.lastErrorCategory = input.errorCategory ?? null
    item.updatedAt = new Date()
  }
}
