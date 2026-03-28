import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  createTestAluno,
  createTestProfessor,
  generateTestToken,
  prismaTest,
  teardownTestDatabase,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Treino modelos e catálogos compartilhados E2E", () => {
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

  it("permite salvar e listar moldes apenas para o professor dono", async () => {
    const { user: ownerUser, professor: ownerProfessor } = await createTestProfessor()
    const { user: otherUser } = await createTestProfessor()

    const ownerToken = generateTestToken({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role as UserRole,
    })
    const otherToken = generateTestToken({
      userId: otherUser.id,
      email: otherUser.email,
      role: otherUser.role as UserRole,
    })

    const exercicio = await prismaTest.exercicio.create({
      data: {
        nome: "Remada Curvada",
        grupamentoMuscular: "COSTAS",
        origem: "PROFESSOR",
        professorId: ownerProfessor.id,
      },
    })

    const createResponse = await app.inject({
      method: "POST",
      url: "/treinos/moldes",
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        nome: "Molde Costas",
        observacoes: "Ciclo base",
        dias: [
          {
            titulo: "Treino A",
            ordem: 1,
            diaSemana: 1,
            exercicios: [
              {
                exercicioId: exercicio.id,
                ordem: 1,
                series: 4,
                repeticoes: "10-12",
              },
            ],
          },
        ],
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = JSON.parse(createResponse.body)
    expect(created.nome).toBe("Molde Costas")

    const listOwnResponse = await app.inject({
      method: "GET",
      url: "/treinos/moldes",
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    })

    expect(listOwnResponse.statusCode).toBe(200)
    const ownList = JSON.parse(listOwnResponse.body)
    expect(ownList).toHaveLength(1)
    expect(ownList[0].id).toBe(created.id)

    const listOtherResponse = await app.inject({
      method: "GET",
      url: "/treinos/moldes",
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    })

    expect(listOtherResponse.statusCode).toBe(200)
    expect(JSON.parse(listOtherResponse.body)).toHaveLength(0)

    const getOtherResponse = await app.inject({
      method: "GET",
      url: `/treinos/moldes/${created.id}`,
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    })

    expect(getOtherResponse.statusCode).toBe(404)
  })

  it("permite que um professor use exercicio personalizado criado por outro professor", async () => {
    const { professor: ownerProfessor } = await createTestProfessor()
    const { user: otherUser, professor: otherProfessor } = await createTestProfessor()
    const { aluno } = await createTestAluno(otherProfessor.id)

    const otherToken = generateTestToken({
      userId: otherUser.id,
      email: otherUser.email,
      role: otherUser.role as UserRole,
    })

    const exercicio = await prismaTest.exercicio.create({
      data: {
        nome: "Avanço Livre",
        grupamentoMuscular: "PERNAS",
        origem: "PROFESSOR",
        professorId: ownerProfessor.id,
      },
    })

    const listResponse = await app.inject({
      method: "GET",
      url: "/exercicios",
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    })

    expect(listResponse.statusCode).toBe(200)
    const listedExercises = JSON.parse(listResponse.body)
    expect(listedExercises.some((item: { id: string }) => item.id === exercicio.id)).toBe(true)

    const upsertResponse = await app.inject({
      method: "POST",
      url: "/treinos/plano",
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
      payload: {
        alunoId: aluno.id,
        nome: "Treino Compartilhado",
        dias: [
          {
            titulo: "Treino A",
            ordem: 1,
            exercicios: [
              {
                exercicioId: exercicio.id,
                ordem: 1,
                series: 3,
                repeticoes: "12",
              },
            ],
          },
        ],
      },
    })

    expect(upsertResponse.statusCode).toBe(201)
    const plano = JSON.parse(upsertResponse.body)
    expect(plano.dias[0].exercicios[0].exercicio.id).toBe(exercicio.id)
  })

  it("permite que um professor use alimento personalizado criado por outro professor", async () => {
    const { professor: ownerProfessor } = await createTestProfessor()
    const { user: otherUser, professor: otherProfessor } = await createTestProfessor()
    const { aluno } = await createTestAluno(otherProfessor.id)

    const otherToken = generateTestToken({
      userId: otherUser.id,
      email: otherUser.email,
      role: otherUser.role as UserRole,
    })

    const alimento = await prismaTest.alimento.create({
      data: {
        nome: "Creme de arroz especial",
        origem: "PROFESSOR",
        professorId: ownerProfessor.id,
        calorias100g: 380,
        proteinas100g: 7,
        carboidratos100g: 84,
        gorduras100g: 1,
        fibras100g: 1,
      },
    })

    const listResponse = await app.inject({
      method: "GET",
      url: "/dietas/alimentos",
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    })

    expect(listResponse.statusCode).toBe(200)
    const listedFoods = JSON.parse(listResponse.body)
    expect(listedFoods.some((item: { id: string }) => item.id === alimento.id)).toBe(true)

    const upsertResponse = await app.inject({
      method: "POST",
      url: "/dietas/plano",
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
      payload: {
        alunoId: aluno.id,
        nome: "Dieta Compartilhada",
        objetivo: "MANTER",
        caloriasMeta: 2200,
        proteinasMetaG: 160,
        carboidratosMetaG: 240,
        gordurasMetaG: 60,
        dias: [
          {
            titulo: "Dia 1",
            ordem: 1,
            refeicoes: [
              {
                nome: "Cafe da manha",
                ordem: 1,
                itens: [
                  {
                    alimentoId: alimento.id,
                    ordem: 1,
                    quantidadeGramas: 80,
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    expect(upsertResponse.statusCode).toBe(201)
    const plano = JSON.parse(upsertResponse.body)
    expect(plano.dias[0].refeicoes[0].itens[0].alimento.id).toBe(alimento.id)
  })
})
