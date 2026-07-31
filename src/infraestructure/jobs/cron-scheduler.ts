import cron, { type ScheduledTask } from "node-cron"
import { JOB_NAMES, getJob, type JobDefinition } from "./job-registry"

/**
 * Agendador in-process, usado só no `pnpm dev` e em qualquer execução de
 * servidor de longa duração. Em Lambda este arquivo nunca é carregado — quem
 * dispara os jobs é o EventBridge, via `src/lambda-crons.ts`.
 *
 * Diferente da Lambda, aqui uma falha não pode derrubar o agendamento: o erro é
 * logado e o timer segue vivo para a próxima janela.
 */
class CronScheduler {
  private tasks: ScheduledTask[] = []

  start(): void {
    if (this.tasks.length > 0) {
      return
    }

    for (const name of JOB_NAMES) {
      const job = getJob(name)

      if (!job.isEnabled()) {
        continue
      }

      this.tasks.push(this.schedule(job))
    }

    if (this.tasks.length > 0) {
      console.log(`[jobs] Scheduler iniciado (${this.tasks.length} jobs)`)
    }
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop()
    }

    this.tasks = []
  }

  private schedule(job: JobDefinition): ScheduledTask {
    return cron.schedule(
      job.schedule,
      () => {
        void job.run().catch((error) => {
          console.error(`[jobs] Erro no job "${job.name}":`, error)
        })
      },
      job.timezone ? { timezone: job.timezone } : undefined,
    )
  }
}

export const cronScheduler = new CronScheduler()
