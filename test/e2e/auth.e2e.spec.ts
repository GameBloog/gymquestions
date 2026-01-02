import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  teardownTestDatabase,
  createTestAdmin,
  createTestInviteCode,
  generateTestToken,
  prismaTest,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Auth E2E", () => {
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

  describe("POST /auth/register", () => {
    it("should register a new ALUNO without invite code", async () => {
      // Criar professor padrão
      const adminUser = await createTestAdmin()
      const professorPadrao = await prismaTest.user.create({
        data: {
          nome: "Professor Padrão",
          email: "padrao@test.com",
          password: "hashedPassword",
          role: "PROFESSOR",
        },
      })
      await prismaTest.professor.create({
        data: {
          userId: professorPadrao.id,
          isPadrao: true,
        },
      })

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          nome: "Aluno Test",
          email: "aluno@test.com",
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("user")
      expect(body.user.email).toBe("aluno@test.com")
      expect(body.user).not.toHaveProperty("password")
    })

    it("should fail to register PROFESSOR without invite code", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          nome: "Professor Test",
          email: "professor@test.com",
          password: "password123",
          role: "PROFESSOR",
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it("should register PROFESSOR with valid invite code", async () => {
      const admin = await createTestAdmin()
      const inviteCode = await createTestInviteCode(
        UserRole.PROFESSOR,
        admin.id
      )

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          nome: "Professor Test",
          email: "professor@test.com",
          password: "password123",
          role: "PROFESSOR",
          inviteCode: inviteCode.code,
          telefone: "11987654321",
          especialidade: "Musculação",
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe("professor@test.com")
    })

    it("should not allow duplicate emails", async () => {
      const admin = await createTestAdmin()

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          nome: "Another Admin",
          email: admin.email,
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it("should validate required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "test@test.com",
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      const admin = await createTestAdmin()

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "admin@test.com",
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("token")
      expect(body).toHaveProperty("user")
      expect(body.user.email).toBe("admin@test.com")
    })

    it("should fail with invalid email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "nonexistent@test.com",
          password: "password123",
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it("should fail with invalid password", async () => {
      await createTestAdmin()

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "admin@test.com",
          password: "wrongpassword",
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe("GET /auth/me", () => {
    it("should return current user info with valid token", async () => {
      const admin = await createTestAdmin()
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: admin.role as UserRole,
      })

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.email).toBe("admin@test.com")
      expect(body).not.toHaveProperty("password")
    })

    it("should fail without token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
      })

      expect(response.statusCode).toBe(401)
    })

    it("should fail with invalid token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: "Bearer invalid-token",
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe("POST /auth/invite-codes", () => {
    it("should create invite code as ADMIN", async () => {
      const admin = await createTestAdmin()
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "POST",
        url: "/auth/invite-codes",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          role: "PROFESSOR",
          expiresInDays: 30,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("code")
      expect(body.role).toBe("PROFESSOR")
    })

    it("should fail to create invite code as non-ADMIN", async () => {
      const professorPadrao = await prismaTest.user.create({
        data: {
          nome: "Professor Test",
          email: "professor@test.com",
          password: "hashedPassword",
          role: "PROFESSOR",
        },
      })
      const token = generateTestToken({
        userId: professorPadrao.id,
        email: professorPadrao.email,
        role: UserRole.PROFESSOR,
      })

      const response = await app.inject({
        method: "POST",
        url: "/auth/invite-codes",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          role: "PROFESSOR",
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe("GET /auth/invite-codes", () => {
    it("should list invite codes as ADMIN", async () => {
      const admin = await createTestAdmin()
      await createTestInviteCode(UserRole.PROFESSOR, admin.id)
      await createTestInviteCode(UserRole.ADMIN, admin.id)

      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      const response = await app.inject({
        method: "GET",
        url: "/auth/invite-codes",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThanOrEqual(2)
    })
  })
})
