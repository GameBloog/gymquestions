import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { app } from "../../../src/app"
import { env } from "../../../src/env"

// Este spec nao toca o banco de proposito: a rejeicao por tamanho acontece no
// parsing do corpo, antes de rota, autenticacao e Prisma. Isso o torna
// executavel sem Docker, ao contrario dos demais specs de upload.
describe("Rejeição por tamanho de corpo", () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it("responde 413 em português, com o limite, quando o corpo passa do teto", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      payload: "x".repeat(env.MAX_FILE_SIZE + 1024),
    })

    expect(response.statusCode).toBe(413)
    expect(JSON.parse(response.body)).toEqual({
      error: `Requisição muito grande. Máximo: ${
        env.MAX_FILE_SIZE / 1024 / 1024
      }MB`,
    })
  })

  it("não interfere em requisição dentro do limite", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email: "nao-existe@example.com", password: "errado" },
    })

    expect(response.statusCode).not.toBe(413)
  })
})
