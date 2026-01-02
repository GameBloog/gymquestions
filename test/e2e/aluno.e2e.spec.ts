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

describe("Aluno E2E", () => {
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

  describe("POST /alunos", () => {
    it("should create aluno as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "POST",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Novo Aluno",
          email: "novoaluno@test.com",
          password: "password123",
          professorId: professor.id,
          alturaCm: 175,
          pesoKg: 70,
          idade: 25,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("id")
      expect(body.professorId).toBe(professor.id)
    })

    it("should create aluno as PROFESSOR for themselves", async () => {
      const { user, professor } = await createTestProfessor()
      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "POST",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Aluno do Professor",
          email: "alunoprof@test.com",
          password: "password123",
          alturaCm: 180,
          pesoKg: 80,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.professorId).toBe(professor.id)
    })

    it("should fail to create aluno as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user } = await createTestAluno(professor.id)
      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "POST",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Novo Aluno",
          email: "novoaluno@test.com",
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should validate required fields", async () => {
      const admin = await createTestAdmin()
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "POST",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          email: "test@test.com",
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe("GET /alunos", () => {
    it("should list all alunos as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor: prof1 } = await createTestProfessor()
      const { professor: prof2 } = await createTestProfessor()
      await createTestAluno(prof1.id)
      await createTestAluno(prof2.id)

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(2)
    })

    it("should list only own alunos as PROFESSOR", async () => {
      const { user, professor } = await createTestProfessor()
      const { professor: otherProf } = await createTestProfessor()
      await createTestAluno(professor.id)
      await createTestAluno(professor.id)
      await createTestAluno(otherProf.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "GET",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.length).toBe(2)
      expect(body.every((a: any) => a.professorId === professor.id)).toBe(true)
    })

    it("should list only self as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user, aluno } = await createTestAluno(professor.id)
      await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "GET",
        url: "/alunos",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.length).toBe(1)
      expect(body[0].id).toBe(aluno.id)
    })
  })

  describe("GET /alunos/:id", () => {
    it("should get aluno by id as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(aluno.id)
    })

    it("should get own aluno as PROFESSOR", async () => {
      const { user, professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "GET",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
    })

    it("should not get other professor's aluno", async () => {
      const { user, professor } = await createTestProfessor()
      const { professor: otherProf } = await createTestProfessor()
      const { aluno } = await createTestAluno(otherProf.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "GET",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should get self as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user, aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "GET",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe("PUT /alunos/:id", () => {
    it("should update aluno as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "PUT",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          pesoKg: 85,
          dias_treino_semana: 5,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.pesoKg).toBe(85)
      expect(body.dias_treino_semana).toBe(5)
    })

    it("should update own aluno as PROFESSOR", async () => {
      const { user, professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "PUT",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          pesoKg: 75,
        },
      })

      expect(response.statusCode).toBe(200)
    })

    it("should update self as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user, aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "PUT",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          pesoKg: 78,
        },
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe("DELETE /alunos/:id", () => {
    it("should delete aluno as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(204)

      const deleted = await prismaTest.aluno.findUnique({
        where: { id: aluno.id },
      })
      expect(deleted).toBeNull()
    })

    it("should delete own aluno as PROFESSOR", async () => {
      const { user, professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(204)
    })

    it("should fail to delete as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user, aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })
})
