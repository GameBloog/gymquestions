import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../../src/app"
import {
  cleanDatabase,
  createTestAluno,
  generateTestToken,
  prismaTest,
  teardownTestDatabase,
} from "../../helpers/test-helpers"
import { UserRole } from "../../../src/domain/entities/user"

/**
 * SEC AUDIT — US1: regressão de autenticação.
 *
 * Contrato aceito: tokens ausentes/mal formatados/inválidos são rejeitados (401)
 * e contas bloqueadas recebem 403.
 */
describe("SEC US1 — Autenticação", () => {
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

  it("rejeita token mal formatado (espera 401)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer not-a-jwt" },
    })
    expect(res.statusCode).toBe(401)
  })

  it("rejeita token com assinatura inválida (espera 401)", async () => {
    // JWT assinado com segredo errado.
    const jwt = require("jsonwebtoken")
    const forged = jwt.sign(
      { userId: "x", email: "x@test.com", role: UserRole.ADMIN },
      "segredo-errado",
      { expiresIn: "1d" },
    )
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${forged}` },
    })
    expect(res.statusCode).toBe(401)
  })

  it("bloqueia conta com blockedAt definido (espera 403)", async () => {
    const { user } = await createTestAluno()
    await prismaTest.user.update({
      where: { id: user.id },
      data: { blockedAt: new Date() },
    })
    const token = generateTestToken({
      userId: user.id,
      email: user.email,
      role: UserRole.ALUNO,
    })
    const res = await app.inject({
      method: "GET",
      url: "/alunos/me",
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  /**
   * SEC-001 (requires_decision): em NODE_ENV=test, quando o usuário do token não
   * existe no banco (ou o lookup falha), o middleware forja request.user a partir
   * do payload do JWT. Habilitar este teste após a decisão/correção: um token de
   * usuário inexistente deve ser 401 mesmo em teste.
   */
  it("SEC-001: token de usuário inexistente é 401 mesmo em teste", async () => {
    const token = generateTestToken({
      userId: "00000000-0000-0000-0000-000000000000",
      email: "ghost@test.com",
      role: UserRole.ADMIN,
    })
    const res = await app.inject({
      method: "GET",
      url: "/finance/dashboard",
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
  })
})
