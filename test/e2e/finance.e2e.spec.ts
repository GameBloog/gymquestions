import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  createTestAdmin,
  createTestAluno,
  createTestProfessor,
  generateTestToken,
  teardownTestDatabase,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Finance E2E", () => {
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

  it("should allow ADMIN and deny PROFESSOR/ALUNO on finance dashboard", async () => {
    const admin = await createTestAdmin()
    const { user: professorUser, professor } = await createTestProfessor()
    const { user: alunoUser } = await createTestAluno(professor.id)

    const adminToken = generateTestToken({
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN,
    })

    const professorToken = generateTestToken({
      userId: professorUser.id,
      email: professorUser.email,
      role: UserRole.PROFESSOR,
    })

    const alunoToken = generateTestToken({
      userId: alunoUser.id,
      email: alunoUser.email,
      role: UserRole.ALUNO,
    })

    const adminResponse = await app.inject({
      method: "GET",
      url: "/finance/dashboard?from=2026-01&to=2026-02",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(adminResponse.statusCode).toBe(200)

    const professorResponse = await app.inject({
      method: "GET",
      url: "/finance/dashboard?from=2026-01&to=2026-02",
      headers: {
        authorization: `Bearer ${professorToken}`,
      },
    })

    expect(professorResponse.statusCode).toBe(403)

    const alunoResponse = await app.inject({
      method: "GET",
      url: "/finance/dashboard?from=2026-01&to=2026-02",
      headers: {
        authorization: `Bearer ${alunoToken}`,
      },
    })

    expect(alunoResponse.statusCode).toBe(403)
  })

  it("should allow create/edit/delete in open month and block writes in closed month until reopen", async () => {
    const admin = await createTestAdmin()
    const { professor } = await createTestProfessor()
    const { aluno } = await createTestAluno(professor.id)

    const adminToken = generateTestToken({
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN,
    })

    const renewalCreate = await app.inject({
      method: "POST",
      url: "/finance/renewals",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        alunoId: aluno.id,
        tipoPlano: "COMPLETO",
        valor: 499.9,
        renovadoEm: "2026-03-10T10:00:00.000Z",
        observacao: "Renovação trimestral",
      },
    })

    expect(renewalCreate.statusCode).toBe(201)
    const renewal = JSON.parse(renewalCreate.body)

    const renewalUpdate = await app.inject({
      method: "PATCH",
      url: `/finance/renewals/${renewal.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        tipoPlano: "TREINO",
        valor: 329.9,
      },
    })

    expect(renewalUpdate.statusCode).toBe(200)
    expect(JSON.parse(renewalUpdate.body).tipoPlano).toBe("TREINO")

    const renewalDelete = await app.inject({
      method: "DELETE",
      url: `/finance/renewals/${renewal.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(renewalDelete.statusCode).toBe(204)

    const entryCreate = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        tipo: "RECEITA",
        categoria: "CAMISA",
        valor: 240,
        quantidade: 4,
        descricao: "Venda de camisetas",
        dataLancamento: "2026-03-11T11:00:00.000Z",
      },
    })

    expect(entryCreate.statusCode).toBe(201)
    const entry = JSON.parse(entryCreate.body)

    const entryUpdate = await app.inject({
      method: "PATCH",
      url: `/finance/entries/${entry.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        valor: 260,
      },
    })

    expect(entryUpdate.statusCode).toBe(200)
    expect(JSON.parse(entryUpdate.body).valor).toBe(260)

    const closeMonth = await app.inject({
      method: "PATCH",
      url: "/finance/months/2026-03/close",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(closeMonth.statusCode).toBe(200)
    expect(JSON.parse(closeMonth.body).status).toBe("FECHADO")

    const blockedCreateEntry = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        tipo: "DESPESA",
        categoria: "CUSTO_OPERACIONAL",
        valor: 80,
        dataLancamento: "2026-03-20T11:00:00.000Z",
      },
    })

    expect(blockedCreateEntry.statusCode).toBe(409)

    const blockedUpdateEntry = await app.inject({
      method: "PATCH",
      url: `/finance/entries/${entry.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        valor: 300,
      },
    })

    expect(blockedUpdateEntry.statusCode).toBe(409)

    const blockedDeleteEntry = await app.inject({
      method: "DELETE",
      url: `/finance/entries/${entry.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(blockedDeleteEntry.statusCode).toBe(409)

    const reopenMonth = await app.inject({
      method: "PATCH",
      url: "/finance/months/2026-03/reopen",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(reopenMonth.statusCode).toBe(200)
    expect(JSON.parse(reopenMonth.body).status).toBe("ABERTO")

    const updateAfterReopen = await app.inject({
      method: "PATCH",
      url: `/finance/entries/${entry.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        valor: 300,
      },
    })

    expect(updateAfterReopen.statusCode).toBe(200)

    const deleteAfterReopen = await app.inject({
      method: "DELETE",
      url: `/finance/entries/${entry.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(deleteAfterReopen.statusCode).toBe(204)
  })
})
