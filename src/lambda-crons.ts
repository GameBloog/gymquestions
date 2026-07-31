import type { Context } from "aws-lambda"
import { getJob, isJobName, type JobName } from "./infraestructure/jobs/job-registry"

/**
 * Entrypoints das Lambdas de cron.
 *
 * Cada invocação executa um job uma única vez e termina — não há timer, não há
 * `node-cron`, não há estado carregado entre execuções. Quem agenda é o
 * EventBridge Scheduler (card 7).
 *
 * O erro é propagado de propósito: os jobs são idempotentes (as notificações
 * usam a constraint única de `NotificationDispatch`, e a limpeza de storage
 * trata recurso inexistente como sucesso), então deixar a invocação falhar dá ao
 * EventBridge um sinal real para reprocessar, em vez de mascarar o problema num
 * `console.error` que ninguém lê.
 */

export interface CronJobEvent {
  job?: string
}

export interface CronJobResult {
  job: JobName
  status: "executed" | "skipped"
  durationMs: number
}

const runJob = async (name: JobName): Promise<CronJobResult> => {
  const job = getJob(name)
  const startedAt = Date.now()

  if (!job.isEnabled()) {
    console.log(`[jobs] "${name}" desabilitado por configuração — ignorado`)
    return { job: name, status: "skipped", durationMs: 0 }
  }

  console.log(`[jobs] "${name}" iniciado`)
  await job.run()

  const durationMs = Date.now() - startedAt
  console.log(`[jobs] "${name}" concluído em ${durationMs}ms`)

  return { job: name, status: "executed", durationMs }
}

const createHandler =
  (name: JobName) =>
  async (_event: unknown, context?: Context): Promise<CronJobResult> => {
    if (context) {
      context.callbackWaitsForEmptyEventLoop = false
    }

    return runJob(name)
  }

/**
 * Handler genérico: o nome do job vem do input estático da regra do EventBridge
 * (ex.: `{"job": "storage-cleanup"}`). Útil para apontar várias regras para uma
 * função só.
 */
export const handler = async (
  event: CronJobEvent,
  context?: Context,
): Promise<CronJobResult> => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false
  }

  const name = event?.job

  if (!name || !isJobName(name)) {
    throw new Error(
      `Job inválido no evento: ${JSON.stringify(name)}. Esperado um de: friday-photo-reminder, reavaliacao-reminder, storage-cleanup`,
    )
  }

  return runJob(name)
}

/** Handlers dedicados — uma função Lambda por job, se o card 7 preferir assim. */
export const fridayPhotoReminder = createHandler("friday-photo-reminder")
export const reavaliacaoReminder = createHandler("reavaliacao-reminder")
export const storageCleanup = createHandler("storage-cleanup")
