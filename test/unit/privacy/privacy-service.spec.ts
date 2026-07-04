import { describe, it, expect, beforeEach, afterAll, vi, afterEach } from "vitest"
import { DataSubjectRequestStatus, DataSubjectRequestType } from "@prisma/client"
import { PrivacyService } from "../../../src/application/use-cases/privacy/privacy-service"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import {
  cleanDatabase,
  createTestAdmin,
  createTestAluno,
  createTestProfessor,
  prismaTest,
  teardownTestDatabase,
} from "../../helpers/test-helpers"

describe("PrivacyService", () => {
  const service = new PrivacyService()

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  it("should mark delete processing as failed when remote file deletion is incomplete", async () => {
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

    vi.spyOn(CloudinaryService, "deleteFile").mockRejectedValue(
      new Error("provider failure with sensitive-public-id")
    )

    const updated = await service.processRequest(
      request.id,
      admin.id,
      DataSubjectRequestStatus.COMPLETED,
      "Concluir exclusao"
    )

    expect(updated.status).toBe(DataSubjectRequestStatus.FAILED)
    expect(updated.response).toContain("Exclusao incompleta")
    expect(updated.response).toContain("1 arquivo")
    expect(updated.response).not.toContain("sensitive-public-id")

    const anonymizedUser = await prismaTest.user.findUnique({
      where: { id: user.id },
    })
    expect(anonymizedUser?.blockedAt).toBeInstanceOf(Date)
    expect(anonymizedUser?.anonymizedAt).toBeInstanceOf(Date)
    expect(anonymizedUser?.email).not.toBe(user.email)

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
