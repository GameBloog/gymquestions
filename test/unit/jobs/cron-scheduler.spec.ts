import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { scheduleMock } = vi.hoisted(() => ({ scheduleMock: vi.fn() }))

/**
 * `node-cron` é mockado para que este teste nunca crie um timer de verdade —
 * só interessa *como* o scheduler chama `cron.schedule`, não o comportamento
 * real da biblioteca (isso é responsabilidade do próprio node-cron).
 */
vi.mock("node-cron", () => ({
  default: { schedule: scheduleMock },
  schedule: scheduleMock,
}))

import { cronScheduler } from "../../../src/infraestructure/jobs/cron-scheduler"
import { JOB_NAMES, jobRegistry } from "../../../src/infraestructure/jobs/job-registry"

const makeScheduledTask = () => ({ stop: vi.fn() })

const enableAllJobs = () => {
  for (const name of JOB_NAMES) {
    vi.spyOn(jobRegistry[name], "isEnabled").mockReturnValue(true)
  }
}

describe("cron scheduler local (pnpm dev)", () => {
  beforeEach(() => {
    scheduleMock.mockReset()
    scheduleMock.mockImplementation(() => makeScheduledTask())
  })

  afterEach(() => {
    cronScheduler.stop()
    vi.restoreAllMocks()
  })

  it("agenda uma tarefa por job habilitado, com a expressão cron e o timezone corretos de cada um", () => {
    enableAllJobs()

    cronScheduler.start()

    expect(scheduleMock).toHaveBeenCalledTimes(JOB_NAMES.length)

    for (const name of JOB_NAMES) {
      const job = jobRegistry[name]
      expect(scheduleMock).toHaveBeenCalledWith(
        job.schedule,
        expect.any(Function),
        job.timezone ? { timezone: job.timezone } : undefined,
      )
    }
  })

  it("não agenda job desabilitado", () => {
    vi.spyOn(jobRegistry["friday-photo-reminder"], "isEnabled").mockReturnValue(
      true,
    )
    vi.spyOn(jobRegistry["reavaliacao-reminder"], "isEnabled").mockReturnValue(
      false,
    )
    vi.spyOn(jobRegistry["storage-cleanup"], "isEnabled").mockReturnValue(false)

    cronScheduler.start()

    expect(scheduleMock).toHaveBeenCalledTimes(1)
    expect(scheduleMock).toHaveBeenCalledWith(
      jobRegistry["friday-photo-reminder"].schedule,
      expect.any(Function),
      { timezone: jobRegistry["friday-photo-reminder"].timezone },
    )
  })

  it("start() chamado duas vezes não duplica o agendamento", () => {
    enableAllJobs()

    cronScheduler.start()
    cronScheduler.start()

    expect(scheduleMock).toHaveBeenCalledTimes(JOB_NAMES.length)
  })

  it("stop() chama stop() em cada tarefa agendada e permite um novo start() depois", () => {
    enableAllJobs()
    const tasks = JOB_NAMES.map(() => makeScheduledTask())
    let callIndex = 0
    scheduleMock.mockImplementation(() => tasks[callIndex++])

    cronScheduler.start()
    cronScheduler.stop()

    for (const task of tasks) {
      expect(task.stop).toHaveBeenCalledTimes(1)
    }

    scheduleMock.mockClear()
    scheduleMock.mockImplementation(() => makeScheduledTask())
    cronScheduler.start()

    expect(scheduleMock).toHaveBeenCalledTimes(JOB_NAMES.length)
  })

  it("erro lançado por job.run() é logado e não derruba o agendamento", async () => {
    vi.spyOn(jobRegistry["storage-cleanup"], "isEnabled").mockReturnValue(true)
    const error = new Error("Cloudinary fora do ar")
    vi.spyOn(jobRegistry["storage-cleanup"], "run").mockRejectedValue(error)
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    cronScheduler.start()

    const [, callback] = scheduleMock.mock.calls[0] as [string, () => void]

    expect(() => callback()).not.toThrow()

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erro no job "storage-cleanup"'),
        error,
      )
    })

    // o timer segue vivo: stop() ainda encontra a tarefa agendada e a encerra
    // sem erro, em vez de o agendamento ter sido derrubado pela falha.
    const [task] = scheduleMock.mock.results.map((result) => result.value)
    expect(() => cronScheduler.stop()).not.toThrow()
    expect(task.stop).toHaveBeenCalledTimes(1)
  })
})
