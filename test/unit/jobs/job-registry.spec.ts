import { afterEach, describe, expect, it, vi } from "vitest"
import {
  JOB_NAMES,
  getJob,
  isJobName,
  jobRegistry,
} from "../../../src/infraestructure/jobs/job-registry"
import { notificationService } from "../../../src/infraestructure/notifications/notification.service"

describe("registro de jobs", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("registra exatamente os três jobs do sistema atual", () => {
    expect(JOB_NAMES).toEqual([
      "friday-photo-reminder",
      "reavaliacao-reminder",
      "storage-cleanup",
    ])
  })

  it("preserva a periodicidade de cada job do node-cron atual", () => {
    expect(getJob("friday-photo-reminder").schedule).toBe("0 9 * * 5")
    expect(getJob("reavaliacao-reminder").schedule).toBe("0 8 * * *")
    expect(getJob("storage-cleanup").schedule).toBe("*/15 * * * *")
  })

  it("mantém os lembretes no fuso de São Paulo", () => {
    expect(getJob("friday-photo-reminder").timezone).toBe("America/Sao_Paulo")
    expect(getJob("reavaliacao-reminder").timezone).toBe("America/Sao_Paulo")
  })

  it("delega o lembrete de fotos ao notification service", async () => {
    const spy = vi
      .spyOn(notificationService, "sendFridayPhotoReminder")
      .mockResolvedValue(undefined)

    await getJob("friday-photo-reminder").run()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("delega os lembretes de reavaliação ao notification service", async () => {
    const spy = vi
      .spyOn(notificationService, "sendReavaliacaoRemindersForToday")
      .mockResolvedValue(undefined)

    await getJob("reavaliacao-reminder").run()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("propaga o erro em vez de engolir", async () => {
    vi.spyOn(notificationService, "sendFridayPhotoReminder").mockRejectedValue(
      new Error("SMTP fora do ar"),
    )

    await expect(getJob("friday-photo-reminder").run()).rejects.toThrow(
      "SMTP fora do ar",
    )
  })

  it("desabilita todos os jobs em ambiente de teste", () => {
    for (const name of JOB_NAMES) {
      expect(jobRegistry[name].isEnabled()).toBe(false)
    }
  })

  it("reconhece apenas nomes de job válidos", () => {
    expect(isJobName("storage-cleanup")).toBe(true)
    expect(isJobName("job-que-nao-existe")).toBe(false)
  })
})
