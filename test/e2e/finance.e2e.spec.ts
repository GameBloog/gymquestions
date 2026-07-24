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

  // feat-professor-financeiro-lancamentos — cenários da spec (docs/implementation/modules/feat-professor-financeiro-lancamentos/spec.md §3)

  it("professor cria renovação para aluno próprio e recebe 403 para aluno de outro professor (Cenários 1, 2)", async () => {
    const { user: professorAUser, professor: professorA } = await createTestProfessor()
    const { professor: professorB } = await createTestProfessor()
    const { aluno: alunoA } = await createTestAluno(professorA.id)
    const { aluno: alunoB } = await createTestAluno(professorB.id)

    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })

    const ownRenewal = await app.inject({
      method: "POST",
      url: "/finance/renewals",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: {
        alunoId: alunoA.id,
        tipoPlano: "COMPLETO",
        valor: 300,
        renovadoEm: "2026-04-05T10:00:00.000Z",
      },
    })

    expect(ownRenewal.statusCode).toBe(201)

    const foreignRenewal = await app.inject({
      method: "POST",
      url: "/finance/renewals",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: {
        alunoId: alunoB.id,
        tipoPlano: "COMPLETO",
        valor: 300,
        renovadoEm: "2026-04-05T10:00:00.000Z",
      },
    })

    expect(foreignRenewal.statusCode).toBe(403)
    expect(JSON.parse(foreignRenewal.body).error).toBe(
      "Você só pode gerenciar renovações dos seus próprios alunos.",
    )
  })

  it("professor edita e exclui renovação de aluno próprio, mesmo criada por admin (Cenários 3, 4)", async () => {
    const admin = await createTestAdmin()
    const { user: professorAUser, professor: professorA } = await createTestProfessor()
    const { aluno: alunoA } = await createTestAluno(professorA.id)

    const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: UserRole.ADMIN })
    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })

    const createdByAdmin = await app.inject({
      method: "POST",
      url: "/finance/renewals",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        alunoId: alunoA.id,
        tipoPlano: "TREINO",
        valor: 200,
        renovadoEm: "2026-04-06T10:00:00.000Z",
      },
    })

    expect(createdByAdmin.statusCode).toBe(201)
    const renewal = JSON.parse(createdByAdmin.body)

    const editByProfessor = await app.inject({
      method: "PATCH",
      url: `/finance/renewals/${renewal.id}`,
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { valor: 250 },
    })

    expect(editByProfessor.statusCode).toBe(200)
    expect(JSON.parse(editByProfessor.body).valor).toBe(250)

    const deleteByProfessor = await app.inject({
      method: "DELETE",
      url: `/finance/renewals/${renewal.id}`,
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(deleteByProfessor.statusCode).toBe(204)
  })

  it("professor cria lançamento manual com professorId automático e ignora professorId forjado no body (Cenários 5, 6)", async () => {
    const { user: professorAUser, professor: professorA } = await createTestProfessor()
    const { professor: professorB } = await createTestProfessor()

    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })

    const created = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: {
        tipo: "RECEITA",
        categoria: "CAMISA",
        valor: 120,
        dataLancamento: "2026-04-07T10:00:00.000Z",
      },
    })

    expect(created.statusCode).toBe(201)
    expect(JSON.parse(created.body).professorId).toBe(professorA.id)

    const forged = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: {
        tipo: "RECEITA",
        categoria: "CAMISA",
        valor: 90,
        dataLancamento: "2026-04-07T10:00:00.000Z",
        professorId: professorB.id,
      },
    })

    expect(forged.statusCode).toBe(201)
    expect(JSON.parse(forged.body).professorId).toBe(professorA.id)
    expect(JSON.parse(forged.body).professorId).not.toBe(professorB.id)
  })

  it("GET /finance/entries retorna para o professor apenas os lançamentos próprios (Cenário 7)", async () => {
    const admin = await createTestAdmin()
    const { user: professorAUser, professor: professorA } = await createTestProfessor()
    const { user: professorBUser } = await createTestProfessor()

    const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: UserRole.ADMIN })
    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })
    const professorBToken = generateTestToken({
      userId: professorBUser.id,
      email: professorBUser.email,
      role: UserRole.PROFESSOR,
    })

    await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 50, dataLancamento: "2026-04-08T10:00:00.000Z" },
    })

    await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorBToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 70, dataLancamento: "2026-04-08T10:00:00.000Z" },
    })

    await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { tipo: "DESPESA", categoria: "CUSTO_OPERACIONAL", valor: 30, dataLancamento: "2026-04-08T10:00:00.000Z" },
    })

    const listForA = await app.inject({
      method: "GET",
      url: "/finance/entries?month=2026-04",
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(listForA.statusCode).toBe(200)
    const entriesForA = JSON.parse(listForA.body)
    expect(entriesForA).toHaveLength(1)
    expect(entriesForA[0].professorId).toBe(professorA.id)

    const listForAdmin = await app.inject({
      method: "GET",
      url: "/finance/entries?month=2026-04",
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(listForAdmin.statusCode).toBe(200)
    expect(JSON.parse(listForAdmin.body)).toHaveLength(3)
  })

  it("professor recebe 403 ao editar/excluir lançamento de outro professor, e consegue no próprio (Cenários 8, 9)", async () => {
    const { user: professorAUser } = await createTestProfessor()
    const { user: professorBUser } = await createTestProfessor()

    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })
    const professorBToken = generateTestToken({
      userId: professorBUser.id,
      email: professorBUser.email,
      role: UserRole.PROFESSOR,
    })

    const createdByB = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorBToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 100, dataLancamento: "2026-04-09T10:00:00.000Z" },
    })

    const entryFromB = JSON.parse(createdByB.body)

    const editByA = await app.inject({
      method: "PATCH",
      url: `/finance/entries/${entryFromB.id}`,
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { valor: 999 },
    })

    expect(editByA.statusCode).toBe(403)
    expect(JSON.parse(editByA.body).error).toBe(
      "Você só pode editar/excluir lançamentos que você criou.",
    )

    const deleteByA = await app.inject({
      method: "DELETE",
      url: `/finance/entries/${entryFromB.id}`,
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(deleteByA.statusCode).toBe(403)

    const createdByA = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 100, dataLancamento: "2026-04-09T10:00:00.000Z" },
    })

    const entryFromA = JSON.parse(createdByA.body)

    const editOwnByA = await app.inject({
      method: "PATCH",
      url: `/finance/entries/${entryFromA.id}`,
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { valor: 150 },
    })

    expect(editOwnByA.statusCode).toBe(200)
    expect(JSON.parse(editOwnByA.body).valor).toBe(150)

    const deleteOwnByA = await app.inject({
      method: "DELETE",
      url: `/finance/entries/${entryFromA.id}`,
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(deleteOwnByA.statusCode).toBe(204)
  })

  it("admin mantém acesso irrestrito a renovações e lançamentos de qualquer professor (Cenário 10)", async () => {
    const admin = await createTestAdmin()
    const { user: professorAUser, professor: professorA } = await createTestProfessor()
    const { aluno: alunoA } = await createTestAluno(professorA.id)

    const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: UserRole.ADMIN })
    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })

    const entryCreatedByProfessor = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 60, dataLancamento: "2026-04-10T10:00:00.000Z" },
    })

    const entry = JSON.parse(entryCreatedByProfessor.body)

    const adminEditsEntry = await app.inject({
      method: "PATCH",
      url: `/finance/entries/${entry.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { valor: 999 },
    })

    expect(adminEditsEntry.statusCode).toBe(200)

    const adminDeletesEntry = await app.inject({
      method: "DELETE",
      url: `/finance/entries/${entry.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(adminDeletesEntry.statusCode).toBe(204)

    const renewalCreatedByProfessor = await app.inject({
      method: "POST",
      url: "/finance/renewals",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: {
        alunoId: alunoA.id,
        tipoPlano: "COMPLETO",
        valor: 300,
        renovadoEm: "2026-04-10T10:00:00.000Z",
      },
    })

    const renewal = JSON.parse(renewalCreatedByProfessor.body)

    const adminEditsRenewal = await app.inject({
      method: "PATCH",
      url: `/finance/renewals/${renewal.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { valor: 350 },
    })

    expect(adminEditsRenewal.statusCode).toBe(200)

    const adminDeletesRenewal = await app.inject({
      method: "DELETE",
      url: `/finance/renewals/${renewal.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(adminDeletesRenewal.statusCode).toBe(204)
  })

  it("mês fechado bloqueia escrita também para o professor (Cenário 11)", async () => {
    const admin = await createTestAdmin()
    const { user: professorAUser, professor: professorA } = await createTestProfessor()
    const { aluno: alunoA } = await createTestAluno(professorA.id)

    const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: UserRole.ADMIN })
    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })

    const closeMonth = await app.inject({
      method: "PATCH",
      url: "/finance/months/2026-04/close",
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(closeMonth.statusCode).toBe(200)

    const blockedEntry = await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 60, dataLancamento: "2026-04-11T10:00:00.000Z" },
    })

    expect(blockedEntry.statusCode).toBe(409)

    const blockedRenewal = await app.inject({
      method: "POST",
      url: "/finance/renewals",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: {
        alunoId: alunoA.id,
        tipoPlano: "COMPLETO",
        valor: 300,
        renovadoEm: "2026-04-11T10:00:00.000Z",
      },
    })

    expect(blockedRenewal.statusCode).toBe(409)
  })

  it("professor não acessa dashboard companywide nem fechar/reabrir mês (Cenário 12)", async () => {
    const { user: professorAUser } = await createTestProfessor()

    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })

    const dashboard = await app.inject({
      method: "GET",
      url: "/finance/dashboard",
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(dashboard.statusCode).toBe(403)

    const close = await app.inject({
      method: "PATCH",
      url: "/finance/months/2026-04/close",
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(close.statusCode).toBe(403)

    const reopen = await app.inject({
      method: "PATCH",
      url: "/finance/months/2026-04/reopen",
      headers: { authorization: `Bearer ${professorAToken}` },
    })

    expect(reopen.statusCode).toBe(403)
  })

  it("dashboard do admin soma todos os lançamentos independentemente do professorId (Cenário 13)", async () => {
    const admin = await createTestAdmin()
    const { user: professorAUser } = await createTestProfessor()
    const { user: professorBUser } = await createTestProfessor()

    const adminToken = generateTestToken({ userId: admin.id, email: admin.email, role: UserRole.ADMIN })
    const professorAToken = generateTestToken({
      userId: professorAUser.id,
      email: professorAUser.email,
      role: UserRole.PROFESSOR,
    })
    const professorBToken = generateTestToken({
      userId: professorBUser.id,
      email: professorBUser.email,
      role: UserRole.PROFESSOR,
    })

    await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorAToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 100, dataLancamento: "2026-04-12T10:00:00.000Z" },
    })

    await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${professorBToken}` },
      payload: { tipo: "RECEITA", categoria: "CAMISA", valor: 200, dataLancamento: "2026-04-12T10:00:00.000Z" },
    })

    await app.inject({
      method: "POST",
      url: "/finance/entries",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { tipo: "RECEITA", categoria: "OUTRA_RECEITA", valor: 300, dataLancamento: "2026-04-12T10:00:00.000Z" },
    })

    const dashboard = await app.inject({
      method: "GET",
      url: "/finance/dashboard?from=2026-04&to=2026-04",
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(dashboard.statusCode).toBe(200)
    const payload = JSON.parse(dashboard.body)
    expect(payload.totals.receitas).toBe(600)
  })
})
