import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../src/app"

// Não toca o banco: a recusa acontece no hook de CORS, antes de rota e Prisma.
describe("CORS de origem não autorizada", () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  // O 500 anterior era indistinguível de falha real do servidor no CloudWatch.
  // Requisição de origem estranha é rotina (bot, scanner, app antigo); tratá-la
  // como erro do servidor faz o alarme de 5xx disparar por ruído.
  it("responde 403, e não 500, numa requisição simples", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://origem-estranha.example" },
    })

    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: "Origem não autorizada" })
  })

  it("responde 403 também no preflight", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/alunos",
      headers: {
        origin: "https://origem-estranha.example",
        "access-control-request-method": "GET",
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it("não devolve cabeçalho de liberação para a origem recusada", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://origem-estranha.example" },
    })

    expect(response.headers["access-control-allow-origin"]).toBeUndefined()
  })

  it("continua atendendo requisição sem Origin (curl, health check)", async () => {
    const response = await app.inject({ method: "GET", url: "/health" })

    expect(response.statusCode).toBe(200)
  })
})
