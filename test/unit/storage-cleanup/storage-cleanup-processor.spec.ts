import { describe, expect, it, vi, afterEach } from "vitest"
import { ProcessStorageDeletionsUseCase } from "../../../src/application/use-cases/storage-cleanup/process-storage-deletions"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { InMemoryStorageCleanupRepository } from "../../repositories/in-memory-storage-cleanup-repository"
import {
  StorageDeletionCategory,
  StorageDeletionErrorCategory,
  StorageDeletionStatus,
  StorageResourceType,
} from "../../../src/domain/entities/storage-cleanup"

describe("ProcessStorageDeletionsUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("marks deletion completed when provider reports deleted", async () => {
    const repository = new InMemoryStorageCleanupRepository()
    const pending = await repository.createPending({
      resourceCategory: StorageDeletionCategory.STUDENT_DOCUMENT,
      resourceType: StorageResourceType.RAW,
      publicId: "gym/private/file",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("deleted")

    await new ProcessStorageDeletionsUseCase(repository).execute()

    expect(repository.pending.find((item) => item.id === pending.id)?.status).toBe(
      StorageDeletionStatus.COMPLETED,
    )
  })

  it("marks not_found completed only when no active reference remains", async () => {
    const repository = new InMemoryStorageCleanupRepository()
    await repository.createPending({
      resourceCategory: StorageDeletionCategory.EVOLUTION_PHOTO,
      resourceType: StorageResourceType.IMAGE,
      publicId: "gym/private/photo",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("not_found")
    const checker = { hasActiveReference: vi.fn().mockResolvedValue(false) }

    await new ProcessStorageDeletionsUseCase(repository, checker as any).execute()

    expect(repository.pending[0].status).toBe(StorageDeletionStatus.COMPLETED)
  })

  it("does not complete not_found when an active reference remains", async () => {
    const repository = new InMemoryStorageCleanupRepository()
    await repository.createPending({
      resourceCategory: StorageDeletionCategory.EXERCISE_MEDIA,
      resourceType: StorageResourceType.IMAGE,
      publicId: "gym/exercicios/media",
    })
    vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("not_found")
    const checker = { hasActiveReference: vi.fn().mockResolvedValue(true) }

    await new ProcessStorageDeletionsUseCase(repository, checker as any).execute()

    expect(repository.pending[0].status).toBe(StorageDeletionStatus.RETRYING)
    expect(repository.pending[0].lastErrorCategory).toBe(
      StorageDeletionErrorCategory.NOT_FOUND_ACTIVE_REFERENCE,
    )
  })

  it("marks permanent failure after five failed attempts", async () => {
    const repository = new InMemoryStorageCleanupRepository()
    const pending = await repository.createPending({
      resourceCategory: StorageDeletionCategory.EXERCISE_MEDIA,
      resourceType: StorageResourceType.IMAGE,
      publicId: "gym/exercicios/media",
    })
    pending.attemptCount = 4
    vi.spyOn(CloudinaryService, "deleteFile").mockRejectedValue(
      new Error("provider unavailable"),
    )

    await new ProcessStorageDeletionsUseCase(repository).execute()

    expect(repository.pending[0].attemptCount).toBe(5)
    expect(repository.pending[0].status).toBe(
      StorageDeletionStatus.PERMANENT_FAILURE,
    )
  })
})
