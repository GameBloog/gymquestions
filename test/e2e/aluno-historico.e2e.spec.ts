import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  createTestProfessor,
  createTestAluno,
  generateTestToken,
  prismaTest,
  teardownTestDatabase,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Aluno Historico E2E", () => {
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

  it("should create and update decimal measurements with canonical right leg field", async () => {
    const { user: professorUser, professor } = await createTestProfessor()
    const { aluno } = await createTestAluno(professor.id)
    const token = generateTestToken({
      userId: professorUser.id,
      email: professorUser.email,
      role: UserRole.PROFESSOR,
    })

    const createResponse = await app.inject({
      method: "POST",
      url: `/alunos/${aluno.id}/historico`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        alunoId: aluno.id,
        pesoKg: 80.2,
        alturaCm: 180,
        cinturaCm: 82.5,
        quadrilCm: 101.5,
        pescocoCm: 38.5,
        pernaDireitaCm: 57.5,
        massaMagraKg: 65.4,
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = JSON.parse(createResponse.body)
    expect(created.cinturaCm).toBe(82.5)
    expect(created.quadrilCm).toBe(101.5)
    expect(created.pescocoCm).toBe(38.5)
    expect(created.pernaDireitaCm).toBe(57.5)
    expect(created.massaMagraKg).toBe(65.4)
    expect(created).not.toHaveProperty("massaMuscularKg")

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/historico/${created.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        cinturaCm: 83.5,
        quadrilCm: 102.5,
        pescocoCm: 39.5,
        pernaDireitaCm: 58.5,
        massaMagraKg: 66.1,
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    const updated = JSON.parse(updateResponse.body)
    expect(updated.cinturaCm).toBe(83.5)
    expect(updated.quadrilCm).toBe(102.5)
    expect(updated.pescocoCm).toBe(39.5)
    expect(updated.pernaDireitaCm).toBe(58.5)
    expect(updated.massaMagraKg).toBe(66.1)

    const saved = await prismaTest.alunoHistorico.findUnique({
      where: { id: created.id },
    })
    expect(saved?.cinturaCm).toBe(83.5)
    expect(saved?.quadrilCm).toBe(102.5)
    expect(saved?.pescocoCm).toBe(39.5)
    expect(saved?.pernaDireitaCm).toBe(58.5)
    expect(saved?.massaMagraKg).toBe(66.1)
  })
})
