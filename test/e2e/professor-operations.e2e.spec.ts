import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest"
import { FinanceRenewalPlanType, ObjetivoDieta } from "@prisma/client"
import { app } from "../../src/app"
import { UserRole } from "../../src/domain/entities/user"
import {
  cleanDatabase,
  createTestAluno,
  createTestProfessor,
  generateTestToken,
  prismaTest,
  teardownTestDatabase,
} from "../helpers/test-helpers"

const tokenFor = (user: { id: string; email: string; role: UserRole }) =>
  generateTestToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

const addUtcMonths = (date: Date, months: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  )

describe("Professor Operations E2E", () => {
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

  it("returns professor-scoped dashboard metrics, feedbacks and reassessments", async () => {
    const { user: professorUser, professor } = await createTestProfessor()
    const { professor: otherProfessor } = await createTestProfessor()
    const { user: alunoUser, aluno } = await createTestAluno(professor.id)
    const { aluno: otherAluno } = await createTestAluno(otherProfessor.id)

    const token = tokenFor({
      id: professorUser.id,
      email: professorUser.email,
      role: UserRole.PROFESSOR,
    })

    const today = new Date()
    const reassessmentHistoryDate = addUtcMonths(today, -1)

    await prismaTest.alunoHistorico.create({
      data: {
        alunoId: aluno.id,
        pesoKg: 76,
        registradoPor: professorUser.id,
        dataRegistro: reassessmentHistoryDate,
      },
    })

    await prismaTest.alunoHistorico.create({
      data: {
        alunoId: otherAluno.id,
        pesoKg: 80,
        registradoPor: professorUser.id,
        dataRegistro: reassessmentHistoryDate,
      },
    })

    const exercicio = await prismaTest.exercicio.create({
      data: {
        nome: "Supino",
        grupamentoMuscular: "PEITO",
        professorId: professor.id,
      },
    })

    const planoTreino = await prismaTest.planoTreino.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        nome: "Treino A",
      },
    })

    const treinoDia = await prismaTest.treinoDia.create({
      data: {
        planoTreinoId: planoTreino.id,
        titulo: "Peito",
        ordem: 1,
      },
    })

    const treinoDiaExercicio = await prismaTest.treinoDiaExercicio.create({
      data: {
        treinoDiaId: treinoDia.id,
        exercicioId: exercicio.id,
        ordem: 1,
      },
    })

    const treinoCheckin = await prismaTest.treinoCheckin.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        planoTreinoId: planoTreino.id,
        treinoDiaId: treinoDia.id,
        status: "CONCLUIDO",
        comentarioAluno: "Senti a carga pesada no final.",
      },
    })

    await prismaTest.treinoExercicioCheckin.create({
      data: {
        checkinId: treinoCheckin.id,
        treinoDiaExercicioId: treinoDiaExercicio.id,
        exercicioId: exercicio.id,
        concluido: true,
        comentarioAluno: "Preciso revisar a técnica.",
      },
    })

    const alimento = await prismaTest.alimento.create({
      data: {
        nome: "Arroz",
        calorias100g: 130,
        proteinas100g: 2.7,
        carboidratos100g: 28,
        gorduras100g: 0.3,
        professorId: professor.id,
      },
    })

    const planoDieta = await prismaTest.planoDieta.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        nome: "Dieta Base",
        objetivo: ObjetivoDieta.MANTER,
        caloriasMeta: 2200,
        proteinasMetaG: 150,
        carboidratosMetaG: 250,
        gordurasMetaG: 70,
      },
    })

    const dietaDia = await prismaTest.dietaDia.create({
      data: {
        planoDietaId: planoDieta.id,
        titulo: "Dia 1",
        ordem: 1,
      },
    })

    const refeicao = await prismaTest.dietaRefeicao.create({
      data: {
        dietaDiaId: dietaDia.id,
        nome: "Almoço",
        ordem: 1,
      },
    })

    await prismaTest.dietaRefeicaoItem.create({
      data: {
        dietaRefeicaoId: refeicao.id,
        alimentoId: alimento.id,
        ordem: 1,
        quantidadeGramas: 100,
        calorias: 130,
        proteinas: 2.7,
        carboidratos: 28,
        gorduras: 0.3,
      },
    })

    const dietaCheckin = await prismaTest.dietaCheckin.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        planoDietaId: planoDieta.id,
        dietaDiaId: dietaDia.id,
        status: "CONCLUIDO",
        observacaoDia: "Fiquei com fome à noite.",
        comentarioProfessor: "Ajustei a ceia.",
      },
    })

    await prismaTest.dietaRefeicaoCheckin.create({
      data: {
        checkinId: dietaCheckin.id,
        dietaRefeicaoId: refeicao.id,
        concluida: true,
        observacaoAluno: "Comi tudo.",
      },
    })

    const response = await app.inject({
      method: "GET",
      url: "/professor/dashboard?feedbackLimit=5&recentDays=14&reavaliacaoWindowDays=5",
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)

    expect(body.summary.alunosAtivos).toBe(1)
    expect(body.summary.semTreinoAtivo).toBe(0)
    expect(body.summary.semDietaAtiva).toBe(0)
    expect(body.summary.aguardandoResposta).toBe(1)
    expect(body.feedbacks.treino).toHaveLength(1)
    expect(body.feedbacks.treino[0]).toMatchObject({
      alunoId: aluno.id,
      alunoNome: alunoUser.nome,
      status: "AGUARDANDO_RESPOSTA",
    })
    expect(body.feedbacks.dieta).toHaveLength(1)
    expect(body.feedbacks.dieta[0]).toMatchObject({
      alunoId: aluno.id,
      status: "RESPONDIDO",
    })
    expect(body.reavaliacoesProximas).toHaveLength(1)
    expect(body.reavaliacoesProximas[0].alunoId).toBe(aluno.id)
  })

  it("returns professor-scoped finance and keeps admin finance protected", async () => {
    const { user: professorUser, professor } = await createTestProfessor()
    const { professor: otherProfessor } = await createTestProfessor()
    const { aluno } = await createTestAluno(professor.id)
    const { aluno: otherAluno } = await createTestAluno(otherProfessor.id)

    const token = tokenFor({
      id: professorUser.id,
      email: professorUser.email,
      role: UserRole.PROFESSOR,
    })

    await prismaTest.financeMonth.createMany({
      data: [{ month: "2026-06" }, { month: "2026-07" }],
    })

    await prismaTest.financeRenewal.createMany({
      data: [
        {
          alunoId: aluno.id,
          month: "2026-06",
          tipoPlano: FinanceRenewalPlanType.COMPLETO,
          valor: 500,
          renovadoEm: new Date("2026-06-05T12:00:00.000Z"),
          createdBy: professorUser.id,
        },
        {
          alunoId: aluno.id,
          month: "2026-07",
          tipoPlano: FinanceRenewalPlanType.TREINO,
          valor: 300,
          renovadoEm: new Date("2026-07-05T12:00:00.000Z"),
          createdBy: professorUser.id,
        },
        {
          alunoId: otherAluno.id,
          month: "2026-06",
          tipoPlano: FinanceRenewalPlanType.COMPLETO,
          valor: 999,
          renovadoEm: new Date("2026-06-05T12:00:00.000Z"),
          createdBy: professorUser.id,
        },
      ],
    })

    const financeResponse = await app.inject({
      method: "GET",
      url: "/professor/finance/dashboard?from=2026-06&to=2026-07",
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(financeResponse.statusCode).toBe(200)
    const financeBody = JSON.parse(financeResponse.body)

    expect(financeBody.totals.receita).toBe(800)
    expect(financeBody.totals.alunosPagantesPeriodo).toBe(1)
    expect(financeBody.totals.ticketMedio).toBe(800)
    expect(financeBody.totals.renewals).toMatchObject({
      total: 2,
      completo: 1,
      treino: 1,
      dieta: 0,
    })
    expect(financeBody.months).toEqual([
      expect.objectContaining({ month: "2026-06", receita: 500 }),
      expect.objectContaining({ month: "2026-07", receita: 300 }),
    ])
    expect(financeBody.ultimasRenovacoes).toHaveLength(2)
    expect(
      financeBody.ultimasRenovacoes.every((item: { alunoId: string }) => item.alunoId === aluno.id),
    ).toBe(true)

    const adminFinanceResponse = await app.inject({
      method: "GET",
      url: "/finance/dashboard?from=2026-06&to=2026-07",
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(adminFinanceResponse.statusCode).toBe(403)
  })
})
