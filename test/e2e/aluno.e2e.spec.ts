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
          objetivos_atuais: "Ganhar massa magra",
          toma_remedio: true,
          remedios_uso: "Vitamina D",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("id")
      expect(body.professorId).toBe(professor.id)
      expect(body.ativo).toBe(true)
      expect(body.objetivos_atuais).toBe("Ganhar massa magra")
      expect(body.toma_remedio).toBe(true)
      expect(body.remedios_uso).toBe("Vitamina D")
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

    it("should fail when toma_remedio is true and remedios_uso is missing", async () => {
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
          email: "novoaluno-remedio@test.com",
          password: "password123",
          professorId: professor.id,
          toma_remedio: true,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe("Dados inválidos")
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
      expect(body.every((a: any) => typeof a.ativo === "boolean")).toBe(true)
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
      expect(typeof body.ativo).toBe("boolean")
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
      const body = JSON.parse(response.body)
      expect(body.ativo).toBe(true)
    })
  })

  describe("PATCH /alunos/:id/status", () => {
    it("should update aluno status as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "PATCH",
        url: `/alunos/${aluno.id}/status`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.ativo).toBe(false)
    })

    it("should update own aluno status as PROFESSOR", async () => {
      const { user, professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "PATCH",
        url: `/alunos/${aluno.id}/status`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.ativo).toBe(false)
    })

    it("should not update other professor aluno status", async () => {
      const { user } = await createTestProfessor()
      const { professor: otherProfessor } = await createTestProfessor()
      const { aluno } = await createTestAluno(otherProfessor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "PATCH",
        url: `/alunos/${aluno.id}/status`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should not allow ALUNO to update status", async () => {
      const { professor } = await createTestProfessor()
      const { user, aluno } = await createTestAluno(professor.id)

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.ALUNO,
      })

      const response = await app.inject({
        method: "PATCH",
        url: `/alunos/${aluno.id}/status`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe("PUT /alunos/:id", () => {
    it("should update aluno as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)
      const novoEmail = `aluno-updated-${Date.now()}@test.com`

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
          nome: "Aluno Atualizado",
          email: novoEmail,
          password: "novaSenha123",
          telefone: "11988888888",
          pesoKg: 85,
          dias_treino_semana: 5,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.pesoKg).toBe(85)
      expect(body.dias_treino_semana).toBe(5)
      expect(body.telefone).toBe("11988888888")
      expect(body.user.nome).toBe("Aluno Atualizado")
      expect(body.user.email).toBe(novoEmail)

      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: novoEmail,
          password: "novaSenha123",
        },
      })

      expect(loginResponse.statusCode).toBe(200)
    })

    it("should reject duplicated email when updating aluno as ADMIN", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)
      const { user: otherProfessorUser } = await createTestProfessor()

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
          email: otherProfessorUser.email,
        },
      })

      expect(response.statusCode).toBe(409)
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

    it("should not allow PROFESSOR to update aluno sensitive user fields", async () => {
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
          nome: "Tentativa indevida",
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should clear remedios_uso when toma_remedio is set to false", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const setMedicationResponse = await app.inject({
        method: "PUT",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          toma_remedio: true,
          remedios_uso: "Remedio X",
        },
      })

      expect(setMedicationResponse.statusCode).toBe(200)

      const clearMedicationResponse = await app.inject({
        method: "PUT",
        url: `/alunos/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          toma_remedio: false,
        },
      })

      expect(clearMedicationResponse.statusCode).toBe(200)
      const body = JSON.parse(clearMedicationResponse.body)
      expect(body.toma_remedio).toBe(false)
      expect(body.remedios_uso).toBeNull()
    })

    it("should fail update when toma_remedio is true and remedios_uso is missing", async () => {
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
          toma_remedio: true,
        },
      })

      expect(response.statusCode).toBe(400)
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

    it("should not allow ALUNO to update own sensitive user fields", async () => {
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
          password: "novaSenha123",
        },
      })

      expect(response.statusCode).toBe(403)
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
