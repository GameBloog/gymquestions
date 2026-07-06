import cron, { type ScheduledTask } from "node-cron"
import { env } from "@/env"
import { ProcessStorageDeletionsUseCase } from "@/application/use-cases/storage-cleanup/process-storage-deletions"
import { PrismaStorageCleanupRepository } from "@/infraestructure/database/respositories/prisma-storage-cleanup-repository"

class StorageCleanupScheduler {
  private task: ScheduledTask | null = null
  private started = false
  private processor = new ProcessStorageDeletionsUseCase(
    new PrismaStorageCleanupRepository(),
  )

  start(): void {
    if (this.started || env.NODE_ENV === "test") {
      return
    }

    this.task = cron.schedule("*/15 * * * *", () => {
      void this.processor.execute().catch((error) => {
        console.error("[storage-cleanup] Erro ao processar limpezas:", error)
      })
    })

    this.started = true
    console.log("[storage-cleanup] Scheduler iniciado")
  }

  stop(): void {
    this.task?.stop()
    this.task = null
    this.started = false
  }
}

export const storageCleanupScheduler = new StorageCleanupScheduler()
