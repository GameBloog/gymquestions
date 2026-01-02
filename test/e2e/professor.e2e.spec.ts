import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  disconnectDatabase,
  createTestAdmin,
  createTestProfessor,
  createTestAluno,
  generateToken,
  prismaTest,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Professor E2E", () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
    await app.close()
  })

  describe("POST /professores", () => {
    it("should create professor as ADMIN", async () => {
      const admin = await createTestAdmin()
      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "POST",
        url: "/professores",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Novo Professor",
          email: "novoprof@test.com",
          password: "password123",
          telefone: "11987654321",
          especialidade: "CrossFit",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("id")
      expect(body).toHaveProperty("user")
      expect(body.user.email).toBe("novoprof@test.com")
    })

    it("should fail to create professor as PROFESSOR", async () => {
      const { user } = await createTestProfessor()
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "POST",
        url: "/professores",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Novo Professor",
          email: "novoprof@test.com",
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should fail to create professor as ALUNO", async () => {
      const { professor } = await createTestProfessor()
      const { user } = await createTestAluno(professor.id)
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "POST",
        url: "/professores",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          nome: "Novo Professor",
          email: "novoprof@test.com",
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should validate required fields", async () => {
      const admin = await createTestAdmin()
      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "POST",
        url: "/professores",
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

  describe("GET /professores", () => {
    it("should list all professores", async () => {
      const admin = await createTestAdmin()
      await createTestProfessor()
      await createTestProfessor()
      await createTestProfessor()

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: "/professores",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(3)
    })

    it("should include user data in professor list", async () => {
      const admin = await createTestAdmin()
      await createTestProfessor()

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: "/professores",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      const body = JSON.parse(response.body)
      expect(body[0]).toHaveProperty("user")
      expect(body[0].user).toHaveProperty("nome")
      expect(body[0].user).toHaveProperty("email")
    })
  })

  describe("GET /professores/:id", () => {
    it("should get professor by id", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(professor.id)
      expect(body).toHaveProperty("user")
    })

    it("should return 404 for non-existent professor", async () => {
      const admin = await createTestAdmin()
      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: "/professores/non-existent-id",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe("PUT /professores/:id", () => {
    it("should update professor as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "PUT",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          telefone: "11999999999",
          especialidade: "Yoga",
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.telefone).toBe("11999999999")
      expect(body.especialidade).toBe("Yoga")
    })

    it("should fail to update professor as non-ADMIN", async () => {
      const { professor } = await createTestProfessor()
      const { user: otherProf } = await createTestProfessor()

      const token = generateToken({
        userId: otherProf.id,
        email: otherProf.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "PUT",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          telefone: "11999999999",
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe("DELETE /professores/:id", () => {
    it("should delete professor as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(204)

      const deleted = await prismaTest.professor.findUnique({
        where: { id: professor.id },
      })
      expect(deleted).toBeNull()
    })

    it("should fail to delete professor with alunos", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      await createTestAluno(professor.id)

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it("should fail to delete professor padrão", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor(true)

      const token = generateToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it("should fail to delete professor as non-ADMIN", async () => {
      const { user, professor } = await createTestProfessor()

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/professores/${professor.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })
})
