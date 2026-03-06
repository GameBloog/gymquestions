import cron, { type ScheduledTask } from "node-cron"
import { env } from "@/env"
import { notificationService } from "./notification.service"

class NotificationScheduler {
  private fridayReminderTask: ScheduledTask | null = null
  private reavaliacaoTask: ScheduledTask | null = null
  private started = false

  start(): void {
    if (this.started || !env.ENABLE_NOTIFICATION_SCHEDULER) {
      return
    }

    if (env.NODE_ENV === "test") {
      return
    }

    this.fridayReminderTask = cron.schedule(
      env.FRIDAY_PHOTO_REMINDER_CRON,
      () => {
        void notificationService.sendFridayPhotoReminder().catch((error) => {
          console.error(
            "[notifications] Erro no job de lembrete de fotos (sexta):",
            error,
          )
        })
      },
      {
        timezone: env.NOTIFICATION_TIMEZONE,
      },
    )

    this.reavaliacaoTask = cron.schedule(
      env.REAVALIACAO_REMINDER_CRON,
      () => {
        void notificationService
          .sendReavaliacaoRemindersForToday()
          .catch((error) => {
            console.error(
              "[notifications] Erro no job de reavaliação diária:",
              error,
            )
          })
      },
      {
        timezone: env.NOTIFICATION_TIMEZONE,
      },
    )

    this.started = true
    console.log(
      `[notifications] Scheduler iniciado (timezone: ${env.NOTIFICATION_TIMEZONE})`,
    )
  }

  stop(): void {
    this.fridayReminderTask?.stop()
    this.reavaliacaoTask?.stop()
    this.fridayReminderTask = null
    this.reavaliacaoTask = null
    this.started = false
  }
}

export const notificationScheduler = new NotificationScheduler()
