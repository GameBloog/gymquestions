import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../../src/app"
import {
  cleanDatabase,
  createTestAluno,
  generateTestToken,
  teardownTestDatabase,
} from "../../helpers/test-helpers"
import { UserRole } from "../../../src/domain/entities/user"

/**
 * SEC AUDIT — US1: regressão de autorização em nível de função (requireRole).
 *
 * Contrato aceito: um ALUNO nunca acessa rotas administrativas/financeiras.
 * Cada cenário espera 403 — qualquer 2xx é escalonamento de privilégio.
 */
describe("SEC US1 — Quebra de autorização de função", () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    await app.close()
  })

  it("ALUNO não acessa rotas ADMIN/financeiras (espera 403)", async () => {
    const { user } = await createTestAluno()
    const token = generateTestToken({
      userId: user.id,
      email: user.email,
      role: UserRole.ALUNO,
    })

    const adminOnly: Array<{ method: "GET" | "POST"; url: string }> = [
      { method: "GET", url: "/finance/dashboard" },
      { method: "GET", url: "/finance/renewals" },
      { method: "GET", url: "/finance/entries" },
      { method: "GET", url: "/auth/invite-codes" },
      { method: "GET", url: "/exercicios/externos?q=supino" },
      { method: "GET", url: "/dietas/alimentos/externos?q=arroz" },
    ]

    for (const { method, url } of adminOnly) {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(
        res.statusCode,
        `${method} ${url} deveria ser 403 para ALUNO, recebeu ${res.statusCode}`,
      ).toBe(403)
    }
  })

  it("requisição sem token é rejeitada (espera 401)", async () => {
    const res = await app.inject({ method: "GET", url: "/finance/dashboard" })
    expect(res.statusCode).toBe(401)
  })
})
