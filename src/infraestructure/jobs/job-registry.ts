import { env } from "@/env"
import { notificationService } from "@/infraestructure/notifications/notification.service"
import { ProcessStorageDeletionsUseCase } from "@/application/use-cases/storage-cleanup/process-storage-deletions"
import { PrismaStorageCleanupRepository } from "@/infraestructure/database/respositories/prisma-storage-cleanup-repository"

/**
 * Registro central dos jobs recorrentes.
 *
 * Um job é só uma função assíncrona que roda uma vez e termina — ele não sabe
 * quem o agendou. Isso permite dois consumidores diferentes:
 *
 *   - dev local: `cron-scheduler.ts` (node-cron, dentro do processo do server)
 *   - produção:  `lambda-crons.ts` (uma invocação por disparo do EventBridge)
 *
 * `run()` propaga o erro de propósito. Quem agenda decide o que fazer com ele:
 * o cron local loga e segue vivo; a Lambda deixa estourar para o EventBridge
 * contabilizar a falha e reprocessar.
 */

export const JOB_NAMES = [
  "friday-photo-reminder",
  "reavaliacao-reminder",
  "storage-cleanup",
] as const

export type JobName = (typeof JOB_NAMES)[number]

export interface JobDefinition {
  name: JobName
  /**
   * Expressão cron usada apenas pelo agendador local. Em produção o
   * agendamento é do EventBridge (card 7) — este valor serve de referência
   * para manter os dois ambientes em sincronia.
   */
  schedule: string
  timezone?: string
  /** Um job desabilitado não é agendado localmente nem executado via Lambda. */
  isEnabled(): boolean
  run(): Promise<void>
}

const notificationsEnabled = () =>
  env.NODE_ENV !== "test" && env.ENABLE_NOTIFICATION_SCHEDULER

export const jobRegistry: Record<JobName, JobDefinition> = {
  "friday-photo-reminder": {
    name: "friday-photo-reminder",
    schedule: env.FRIDAY_PHOTO_REMINDER_CRON,
    timezone: env.NOTIFICATION_TIMEZONE,
    isEnabled: notificationsEnabled,
    run: () => notificationService.sendFridayPhotoReminder(),
  },

  "reavaliacao-reminder": {
    name: "reavaliacao-reminder",
    schedule: env.REAVALIACAO_REMINDER_CRON,
    timezone: env.NOTIFICATION_TIMEZONE,
    isEnabled: notificationsEnabled,
    run: () => notificationService.sendReavaliacaoRemindersForToday(),
  },

  "storage-cleanup": {
    name: "storage-cleanup",
    schedule: "*/15 * * * *",
    isEnabled: () => env.NODE_ENV !== "test",
    run: async () => {
      const processor = new ProcessStorageDeletionsUseCase(
        new PrismaStorageCleanupRepository(),
      )

      await processor.execute()
    },
  },
}

export const isJobName = (value: string): value is JobName =>
  (JOB_NAMES as readonly string[]).includes(value)

export const getJob = (name: JobName): JobDefinition => jobRegistry[name]
