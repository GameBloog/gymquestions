import { afterEach, describe, expect, it, vi } from "vitest"
import { jobRegistry } from "../../../src/infraestructure/jobs/job-registry"

const { scheduleMock } = vi.hoisted(() => ({
  scheduleMock: vi.fn(() => ({ stop: vi.fn() })),
}))

/**
 * `node-cron` não é importado por `src/lambda-crons.ts` — quem agenda é o
 * EventBridge. Mockamos o módulo aqui só para o teste abaixo poder provar
 * isso diretamente: se algum dia o handler passar a chamar
 * `cronScheduler.start()` por engano, `cron.schedule` seria invocado e o
 * teste pegaria a regressão (um spy em `setInterval`/`setTimeout` não
 * pegaria, pois o `node-cron` usa `setTimeout` internamente).
 */
vi.mock("node-cron", () => ({
  default: { schedule: scheduleMock },
  schedule: scheduleMock,
}))

import { cronScheduler } from "../../../src/infraestructure/jobs/cron-scheduler"
import {
  fridayPhotoReminder,
  handler,
  reavaliacaoReminder,
  storageCleanup,
} from "../../../src/lambda-crons"

const enable = (name: keyof typeof jobRegistry) =>
  vi.spyOn(jobRegistry[name], "isEnabled").mockReturnValue(true)

describe("handlers de cron da Lambda", () => {
  afterEach(() => {
    // Garante que o singleton do scheduler local não carregue estado (tarefas
    // agendadas) de um teste para o outro — sem isso, um teste anterior que
    // eventualmente o inicie mascararia a ausência de agendamento nos
    // testes seguintes.
    cronScheduler.stop()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("executa o lembrete de fotos uma única vez", async () => {
    enable("friday-photo-reminder")
    const run = vi
      .spyOn(jobRegistry["friday-photo-reminder"], "run")
      .mockResolvedValue(undefined)

    const result = await fridayPhotoReminder({}, undefined)

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.job).toBe("friday-photo-reminder")
    expect(result.status).toBe("executed")
  })

  it("executa os lembretes de reavaliação uma única vez", async () => {
    enable("reavaliacao-reminder")
    const run = vi
      .spyOn(jobRegistry["reavaliacao-reminder"], "run")
      .mockResolvedValue(undefined)

    const result = await reavaliacaoReminder({}, undefined)

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.status).toBe("executed")
  })

  it("executa a limpeza de storage uma única vez", async () => {
    enable("storage-cleanup")
    const run = vi
      .spyOn(jobRegistry["storage-cleanup"], "run")
      .mockResolvedValue(undefined)

    const result = await storageCleanup({}, undefined)

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.status).toBe("executed")
  })

  it("não executa o job quando ele está desabilitado por configuração", async () => {
    const run = vi
      .spyOn(jobRegistry["storage-cleanup"], "run")
      .mockResolvedValue(undefined)

    const result = await storageCleanup({}, undefined)

    expect(run).not.toHaveBeenCalled()
    expect(result.status).toBe("skipped")
  })

  it("não agenda nada — quem agenda é o EventBridge", async () => {
    enable("storage-cleanup")
    vi.spyOn(jobRegistry["storage-cleanup"], "run").mockResolvedValue(undefined)

    await storageCleanup({}, undefined)

    expect(scheduleMock).not.toHaveBeenCalled()
  })

  it("propaga a falha para a invocação ser marcada como erro", async () => {
    enable("storage-cleanup")
    vi.spyOn(jobRegistry["storage-cleanup"], "run").mockRejectedValue(
      new Error("Cloudinary fora do ar"),
    )

    await expect(storageCleanup({}, undefined)).rejects.toThrow(
      "Cloudinary fora do ar",
    )
  })

  it("o handler genérico roda o job indicado no evento", async () => {
    enable("storage-cleanup")
    const run = vi
      .spyOn(jobRegistry["storage-cleanup"], "run")
      .mockResolvedValue(undefined)

    const result = await handler({ job: "storage-cleanup" })

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.job).toBe("storage-cleanup")
  })

  it("o handler genérico recusa job desconhecido", async () => {
    await expect(handler({ job: "job-que-nao-existe" })).rejects.toThrow(
      /Job inválido no evento/,
    )
  })

  it("o handler genérico recusa evento sem job", async () => {
    await expect(handler({})).rejects.toThrow(/Job inválido no evento/)
  })

  it("com ENABLE_NOTIFICATION_SCHEDULER ligado e NODE_ENV diferente de 'test', os três jobs do registro reportam isEnabled() === true", async () => {
    // Fixa a decisão da correção do serverless.yml: ENABLE_NOTIFICATION_SCHEDULER
    // não pode voltar a ser fixado em 'false' no bloco `environment` do
    // serverless.yml. src/env.ts valida com Zod no import e não dá para
    // sobrescrever o singleton `env` já carregado — por isso o teste reseta o
    // registro de módulos e reimporta job-registry.ts com um process.env novo,
    // do mesmo jeito que test/unit/env.spec.ts reparseia o schema.
    const originalEnv = { ...process.env }

    try {
      process.env = {
        ...originalEnv,
        NODE_ENV: "production",
        ENABLE_NOTIFICATION_SCHEDULER: "true",
        DATABASE_URL: "postgresql://user:password@localhost:5432/gforce",
        JWT_SECRET:
          "production_secret_key_for_testing_purposes_with_64_characters_minimum",
        CLOUDINARY_CLOUD_NAME: "cloud",
        CLOUDINARY_API_KEY: "key",
        CLOUDINARY_API_SECRET: "secret",
        LEAD_TRACKING_SALT: "production-lead-tracking-salt",
        PRIVACY_CONTROLLER_NAME: "Controlador Teste",
        PRIVACY_CONTROLLER_DOCUMENT_TYPE: "CPF",
        PRIVACY_CONTROLLER_DOCUMENT: "123.456.789-01",
        PRIVACY_CONTROLLER_ADDRESS: "Rua Teste, 123",
        PRIVACY_CONTACT_EMAIL: "privacidade@example.com",
      }

      vi.resetModules()
      const { jobRegistry: freshJobRegistry } = await import(
        "../../../src/infraestructure/jobs/job-registry"
      )

      expect(freshJobRegistry["friday-photo-reminder"].isEnabled()).toBe(true)
      expect(freshJobRegistry["reavaliacao-reminder"].isEnabled()).toBe(true)
      expect(freshJobRegistry["storage-cleanup"].isEnabled()).toBe(true)
    } finally {
      process.env = originalEnv
      vi.resetModules()
    }
  })
})
