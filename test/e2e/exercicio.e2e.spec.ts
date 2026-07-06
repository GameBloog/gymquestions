import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  teardownTestDatabase,
  createTestAdmin,
  createTestProfessor,
  createTestAluno,
  generateTestToken,
  prismaTest,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Exercicio E2E", () => {
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

  describe("POST /exercicios", () => {
    it("should create a global system exercise as ADMIN", async () => {
      const admin = await createTestAdmin()
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "POST",
        url: "/exercicios",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Agachamento Admin",
          descricao: "Criado pelo administrador",
          grupamentoMuscular: "PERNAS",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe("Agachamento Admin")
      expect(body.origem).toBe("SISTEMA")
      expect(body.professorId).toBeNull()

      const saved = await prismaTest.exercicio.findUnique({
        where: { id: body.id },
      })
      expect(saved?.origem).toBe("SISTEMA")
      expect(saved?.professorId).toBeNull()
    })

    it("should create a professor-owned exercise as PROFESSOR", async () => {
      const { user, professor } = await createTestProfessor()
      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "POST",
        url: "/exercicios",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Supino Professor",
          descricao: "Criado pelo professor",
          grupamentoMuscular: "PEITO",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe("Supino Professor")
      expect(body.origem).toBe("PROFESSOR")
      expect(body.professorId).toBe(professor.id)
    })

    it("should reject exercise creation as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user } = await createTestAluno(professor.id)
      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "POST",
        url: "/exercicios",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Remada Aluno",
          descricao: "Tentativa do aluno",
          grupamentoMuscular: "COSTAS",
        },
      })

      expect(response.statusCode).toBe(403)
      expect(await prismaTest.exercicio.count()).toBe(0)
    })
  })
})
