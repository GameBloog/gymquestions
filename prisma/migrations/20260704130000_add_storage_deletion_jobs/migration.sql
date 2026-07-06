-- CreateEnum
CREATE TYPE "StorageDeletionCategory" AS ENUM ('EXERCISE_MEDIA', 'STUDENT_DOCUMENT', 'EVOLUTION_PHOTO', 'COMPENSATION_UPLOAD');

-- CreateEnum
CREATE TYPE "StorageResourceType" AS ENUM ('IMAGE', 'RAW');

-- CreateEnum
CREATE TYPE "StorageDeletionStatus" AS ENUM ('PENDING', 'RETRYING', 'COMPLETED', 'PERMANENT_FAILURE');

-- CreateEnum
CREATE TYPE "StorageDeletionErrorCategory" AS ENUM ('PROVIDER_ERROR', 'NOT_FOUND_ACTIVE_REFERENCE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StorageCleanupAttemptOutcome" AS ENUM ('SUCCESS', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE', 'SAFE_NOT_FOUND');

-- CreateTable
CREATE TABLE "pending_storage_deletions" (
    "id" TEXT NOT NULL,
    "resourceCategory" "StorageDeletionCategory" NOT NULL,
    "resourceType" "StorageResourceType" NOT NULL,
    "publicId" TEXT NOT NULL,
    "relatedRecordId" TEXT,
    "relatedParentId" TEXT,
    "status" "StorageDeletionStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptedAt" TIMESTAMP(3),
    "lastErrorCategory" "StorageDeletionErrorCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_storage_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_cleanup_attempts" (
    "id" TEXT NOT NULL,
    "pendingDeletionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "outcome" "StorageCleanupAttemptOutcome" NOT NULL,
    "errorCategory" "StorageDeletionErrorCategory",
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_cleanup_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_storage_deletions_publicId_resourceType_status_key" ON "pending_storage_deletions"("publicId", "resourceType", "status");

-- CreateIndex
CREATE INDEX "pending_storage_deletions_status_nextAttemptAt_idx" ON "pending_storage_deletions"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "pending_storage_deletions_resourceCategory_idx" ON "pending_storage_deletions"("resourceCategory");

-- CreateIndex
CREATE INDEX "pending_storage_deletions_relatedRecordId_idx" ON "pending_storage_deletions"("relatedRecordId");

-- CreateIndex
CREATE INDEX "storage_cleanup_attempts_pendingDeletionId_attemptNumber_idx" ON "storage_cleanup_attempts"("pendingDeletionId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "storage_cleanup_attempts" ADD CONSTRAINT "storage_cleanup_attempts_pendingDeletionId_fkey" FOREIGN KEY ("pendingDeletionId") REFERENCES "pending_storage_deletions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
