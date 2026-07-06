import {
  StorageDeletionCategory,
  StorageResourceType,
} from "../../src/domain/entities/storage-cleanup"

export const createStorageDeletionTarget = (
  publicId = "gym/test/file",
) => ({
  resourceCategory: StorageDeletionCategory.COMPENSATION_UPLOAD,
  resourceType: StorageResourceType.IMAGE,
  publicId,
  relatedRecordId: "record-1",
  relatedParentId: "parent-1",
})
