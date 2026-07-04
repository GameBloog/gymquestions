import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from "vitest"
import { DataSubjectRequestStatus, DataSubjectRequestType } from "@prisma/client"
import { app } from "../../src/app"
import { CloudinaryService } from "../../src/infraestructure/storage/cloudinary.service"
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

describe("Privacy E2E", () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    await app.close()
  })

  describe("PATCH /privacy/admin/requests/:id", () => {
    it("should return a failed incomplete outcome when storage deletion fails", async () => {
      const admin = await createTestAdmin()
      const { professor } = await createTestProfessor()
      const { user, aluno } = await createTestAluno(professor.id)

      const foto = await prismaTest.fotoShape.create({
        data: {
          alunoId: aluno.id,
          url: "https://res.cloudinary.com/private/foto.jpg",
          publicId: "gym/private/fotos-shape/sensitive-public-id",
        },
      })
      const request = await prismaTest.dataSubjectRequest.create({
        data: {
          userId: user.id,
          type: DataSubjectRequestType.DELETE,
        },
      })
      const token = generateTestToken({
        userId: admin.id,
        email: admin.email,
        role: UserRole.ADMIN,
      })

      vi.spyOn(CloudinaryService, "deleteFile").mockRejectedValue(
        new Error("provider failure with sensitive-public-id")
      )

      const response = await app.inject({
        method: "PATCH",
        url: `/privacy/admin/requests/${request.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          status: DataSubjectRequestStatus.COMPLETED,
          response: "Concluir exclusao",
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe(DataSubjectRequestStatus.FAILED)
      expect(body.response).toContain("Exclusao incompleta")
      expect(body.response).toContain("1 arquivo")
      expect(body.response).not.toContain("sensitive-public-id")

      const anonymizedUser = await prismaTest.user.findUnique({
        where: { id: user.id },
      })
      expect(anonymizedUser?.blockedAt).toBeInstanceOf(Date)
      expect(anonymizedUser?.anonymizedAt).toBeInstanceOf(Date)
      expect(await prismaTest.fotoShape.findUnique({ where: { id: foto.id } })).toBeNull()

      const partialAudit = await prismaTest.privacyAuditEvent.findFirst({
        where: {
          subjectId: user.id,
          action: "USER_ERASURE_PARTIAL",
        },
      })
      expect(partialAudit?.metadata).toEqual({
        failures: [`foto:${foto.id}`],
      })
    })
  })
})
