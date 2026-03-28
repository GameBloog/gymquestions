import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  createTestAdmin,
  createTestAluno,
  createTestProfessor,
  generateTestToken,
  prismaTest,
  teardownTestDatabase,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Foto Shape E2E", () => {
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

  describe("GET /fotos-shape/aluno/:alunoId", () => {
    it("should deny a professor from listing another professor's student photos", async () => {
      const { user: currentProfessorUser } = await createTestProfessor()
      const { professor: otherProfessor } = await createTestProfessor()
      const { aluno } = await createTestAluno(otherProfessor.id)

      await prismaTest.fotoShape.create({
        data: {
          alunoId: aluno.id,
          url: "https://example.com/foto.jpg",
          publicId: "foto-shape-1",
        },
      })

      const token = generateTestToken({
        userId: currentProfessorUser.id,
        email: currentProfessorUser.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "GET",
        url: `/fotos-shape/aluno/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should allow a professor to list their own student's photos", async () => {
      const { user, professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      await prismaTest.fotoShape.create({
        data: {
          alunoId: aluno.id,
          url: "https://example.com/foto.jpg",
          publicId: "foto-shape-2",
        },
      })

      const token = generateTestToken({
        userId: user.id,
        email: user.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "GET",
        url: `/fotos-shape/aluno/${aluno.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveLength(1)
    })
  })

  describe("DELETE /fotos-shape/:id", () => {
    it("should deny a professor from deleting another professor's student photo", async () => {
      const { user: currentProfessorUser } = await createTestProfessor()
      const { professor: otherProfessor } = await createTestProfessor()
      const { aluno } = await createTestAluno(otherProfessor.id)

      const foto = await prismaTest.fotoShape.create({
        data: {
          alunoId: aluno.id,
          url: "https://example.com/foto.jpg",
          publicId: "foto-shape-3",
        },
      })

      const token = generateTestToken({
        userId: currentProfessorUser.id,
        email: currentProfessorUser.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/fotos-shape/${foto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it("should allow ADMIN to delete any photo", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { aluno } = await createTestAluno(professor.id)

      const foto = await prismaTest.fotoShape.create({
        data: {
          alunoId: aluno.id,
          url: "https://example.com/foto.jpg",
          publicId: "foto-shape-4",
        },
      })

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "DELETE",
        url: `/fotos-shape/${foto.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(204)
    })
  })
})
