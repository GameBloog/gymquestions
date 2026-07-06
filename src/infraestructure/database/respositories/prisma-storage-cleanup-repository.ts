import { Prisma } from "@prisma/client"
import { StorageCleanupRepository } from "@/application/repositories/storage-cleanup-repository"
import {
  CreatePendingStorageDeletionInput,
  PendingStorageDeletion,
  StorageCleanupAttemptOutcome,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
} from "@/domain/entities/storage-cleanup"
import { prisma } from "../prisma"

const activeStatuses: StorageDeletionStatus[] = [
  StorageDeletionStatus.PENDING,
  StorageDeletionStatus.RETRYING,
]

export class PrismaStorageCleanupRepository
  implements StorageCleanupRepository
{
  async createPending(
    input: CreatePendingStorageDeletionInput,
  ): Promise<PendingStorageDeletion> {
    const existing = await prisma.pendingStorageDeletion.findFirst({
      where: {
        publicId: input.publicId,
        resourceType: input.resourceType,
        status: { in: activeStatuses },
      },
    })

    if (existing) {
      return existing
    }

    return prisma.pendingStorageDeletion.create({
      data: {
        resourceCategory: input.resourceCategory,
        resourceType: input.resourceType,
        publicId: input.publicId,
        relatedRecordId: input.relatedRecordId ?? null,
        relatedParentId: input.relatedParentId ?? null,
      },
    })
  }

  async findPendingByPublicId(
    publicId: string,
    resourceType: "IMAGE" | "RAW",
  ): Promise<PendingStorageDeletion | null> {
    return prisma.pendingStorageDeletion.findFirst({
      where: {
        publicId,
        resourceType,
        status: { in: activeStatuses },
      },
    })
  }

  async findDue(limit: number, now = new Date()): Promise<PendingStorageDeletion[]> {
    return prisma.pendingStorageDeletion.findMany({
      where: {
        status: { in: activeStatuses },
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: "asc" },
      take: limit,
    })
  }

  async listByStatus(
    status?: StorageDeletionStatus,
  ): Promise<PendingStorageDeletion[]> {
    return prisma.pendingStorageDeletion.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { nextAttemptAt: "asc" }],
    })
  }

  async markCompleted(id: string): Promise<void> {
    await prisma.pendingStorageDeletion.update({
      where: { id },
      data: {
        status: StorageDeletionStatus.COMPLETED,
        lastAttemptedAt: new Date(),
        lastErrorCategory: null,
      },
    })
  }

  async recordAttempt(input: {
    id: string
    outcome: StorageCleanupAttemptOutcome
    errorCategory?: StorageDeletionErrorCategory
    nextAttemptAt?: Date
    permanentFailure?: boolean
  }): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.pendingStorageDeletion.findUniqueOrThrow({
        where: { id: input.id },
      })
      const attemptNumber = current.attemptCount + 1

      await tx.storageCleanupAttempt.create({
        data: {
          pendingDeletionId: input.id,
          attemptNumber,
          outcome: input.outcome,
          errorCategory: input.errorCategory ?? null,
        },
      })

      await tx.pendingStorageDeletion.update({
        where: { id: input.id },
        data: {
          attemptCount: attemptNumber,
          status: input.permanentFailure
            ? StorageDeletionStatus.PERMANENT_FAILURE
            : StorageDeletionStatus.RETRYING,
          nextAttemptAt: input.nextAttemptAt ?? current.nextAttemptAt,
          lastAttemptedAt: new Date(),
          lastErrorCategory: input.errorCategory ?? null,
        },
      })
    })
  }
}
