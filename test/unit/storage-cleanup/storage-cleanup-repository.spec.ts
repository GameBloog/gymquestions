import { describe, expect, it } from "vitest"
import { InMemoryStorageCleanupRepository } from "../../repositories/in-memory-storage-cleanup-repository"
import {
  StorageDeletionCategory,
  StorageResourceType,
} from "../../../src/domain/entities/storage-cleanup"

describe("Storage cleanup repository metadata", () => {
  it("stores non-sensitive cleanup metadata without signed URLs", async () => {
    const repository = new InMemoryStorageCleanupRepository()

    const pending = await repository.createPending({
      resourceCategory: StorageDeletionCategory.COMPENSATION_UPLOAD,
      resourceType: StorageResourceType.IMAGE,
      publicId: "gym/private/photo",
      relatedRecordId: "record-1",
      relatedParentId: "parent-1",
    })

    expect(JSON.stringify(pending)).not.toContain("https://")
    expect(JSON.stringify(pending)).not.toContain("api_secret")
    expect(pending.publicId).toBe("gym/private/photo")
  })
})
