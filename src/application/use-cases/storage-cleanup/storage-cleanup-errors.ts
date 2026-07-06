import { AppError } from "@/shared/errors/app-error"
import { StorageDeletionErrorCategory } from "@/domain/entities/storage-cleanup"

export const MAX_STORAGE_DELETION_ATTEMPTS = 5

export class StorageFileNotFoundError extends Error {
  constructor(public readonly publicId: string) {
    super("Arquivo remoto não encontrado")
  }
}

export function classifyStorageDeletionError(
  error: unknown,
): StorageDeletionErrorCategory {
  if (error instanceof StorageFileNotFoundError) {
    return StorageDeletionErrorCategory.NOT_FOUND_ACTIVE_REFERENCE
  }

  if (error instanceof AppError) {
    return StorageDeletionErrorCategory.PROVIDER_ERROR
  }

  return StorageDeletionErrorCategory.UNKNOWN
}

export function getNextStorageDeletionAttemptAt(
  attemptCount: number,
  now = new Date(),
): Date {
  const backoffMinutes = Math.min(60, 2 ** Math.max(0, attemptCount - 1))
  return new Date(now.getTime() + backoffMinutes * 60 * 1000)
}
