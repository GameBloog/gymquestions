import { beforeEach, describe, expect, it } from "vitest"
import { RegisterUseCase } from "../../src/application/use-cases/auth/register"
import { UpdateAlunoUseCase } from "../../src/application/use-cases/aluno/update-aluno"
import { privacyService } from "../../src/application/use-cases/privacy/privacy-service"
import { UserRole } from "../../src/domain/entities/user"
import { PrismaAccountUnitOfWork } from "../../src/infraestructure/database/prisma-account-unit-of-work"
import { PrismaAlunoRepository } from "../../src/infraestructure/database/respositories/prisma-aluno-repository"
import { PrismaInviteCodeRepository } from "../../src/infraestructure/database/respositories/prisma-invite-code-repository"
import { PrismaProfessorRepository } from "../../src/infraestructure/database/respositories/prisma-professor-repository"
import { PrismaUserRepository } from "../../src/infraestructure/database/respositories/prisma-user-repository"
import {
  cleanDatabase,
  createTestAluno,
  createTestProfessor,
  prismaTest,
} from "../helpers/test-helpers"

const userRepository = new PrismaUserRepository()
const inviteCodeRepository = new PrismaInviteCodeRepository()
const professorRepository = new PrismaProfessorRepository()
const alunoRepository = new PrismaAlunoRepository()
const accountUnitOfWork = new PrismaAccountUnitOfWork()

function createRegisterUseCase() {
  return new RegisterUseCase(
    userRepository,
    inviteCodeRepository,
    accountUnitOfWork,
  )
}

async function currentAcceptedDocuments() {
  await privacyService.ensureCurrentDocuments()
  const documents = await prismaTest.legalDocumentVersion.findMany({
    where: { isCurrent: true },
  })

  return documents.map((document) => ({
    documentType: document.documentType,
    version: document.version,
  }))
}

describe("Account transaction atomicity", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it("rolls back user creation when the aluno profile cannot be created", async () => {
    const acceptedDocuments = await currentAcceptedDocuments()

    await expect(
      createRegisterUseCase().execute({
        nome: "Aluno sem professor",
        email: "rollback-register@test.com",
        password: "password123",
        acceptedDocuments,
        privacyPreferences: {
          analyticsConsent: false,
          marketingConsent: false,
        },
      }),
    ).rejects.toThrow("Professor padrão não configurado")

    expect(
      await prismaTest.user.findUnique({
        where: { email: "rollback-register@test.com" },
      }),
    ).toBeNull()
    expect(await prismaTest.userLegalAcceptance.count()).toBe(0)
    expect(await prismaTest.privacyPreference.count()).toBe(0)
  })

  it("allows only one concurrent registration to consume an invite", async () => {
    const acceptedDocuments = await currentAcceptedDocuments()
    const admin = await prismaTest.user.create({
      data: {
        nome: "Admin",
        email: "admin-invite@test.com",
        password: "hashed",
        role: UserRole.ADMIN,
      },
    })
    const invite = await prismaTest.inviteCode.create({
      data: {
        code: "PROF-CONCURRENT-TEST",
        role: UserRole.PROFESSOR,
        createdBy: admin.id,
      },
    })

    const payload = {
      password: "password123",
      role: UserRole.PROFESSOR,
      inviteCode: invite.code,
      acceptedDocuments,
      privacyPreferences: {
        analyticsConsent: false,
        marketingConsent: false,
      },
    }
    const results = await Promise.allSettled([
      createRegisterUseCase().execute({
        ...payload,
        nome: "Professor Um",
        email: "professor-one@test.com",
      }),
      createRegisterUseCase().execute({
        ...payload,
        nome: "Professor Dois",
        email: "professor-two@test.com",
      }),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    )
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    )

    const createdProfessors = await prismaTest.user.findMany({
      where: {
        email: {
          in: ["professor-one@test.com", "professor-two@test.com"],
        },
      },
      include: { professorProfile: true },
    })
    expect(createdProfessors).toHaveLength(1)
    expect(createdProfessors[0].professorProfile).not.toBeNull()
    expect(
      await prismaTest.userLegalAcceptance.count({
        where: { userId: createdProfessors[0].id },
      }),
    ).toBe(acceptedDocuments.length)
    expect(
      await prismaTest.privacyPreference.findUnique({
        where: { userId: createdProfessors[0].id },
      }),
    ).not.toBeNull()

    const consumedInvite = await prismaTest.inviteCode.findUniqueOrThrow({
      where: { id: invite.id },
    })
    expect(consumedInvite.usedBy).toBe(createdProfessors[0].id)
  })

  it("rolls back user changes when the aluno update fails", async () => {
    const { professor } = await createTestProfessor()
    const { user, aluno } = await createTestAluno(professor.id)
    const useCase = new UpdateAlunoUseCase(
      alunoRepository,
      accountUnitOfWork,
    )

    await expect(
      useCase.execute(aluno.id, {
        nome: "Nome não deve persistir",
        sexoBiologico: "INVALID" as any,
      }),
    ).rejects.toThrow()

    const unchangedUser = await prismaTest.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    const unchangedAluno = await prismaTest.aluno.findUniqueOrThrow({
      where: { id: aluno.id },
    })
    expect(unchangedUser.nome).toBe(user.nome)
    expect(unchangedAluno.sexoBiologico).toBe(aluno.sexoBiologico)
  })
})
