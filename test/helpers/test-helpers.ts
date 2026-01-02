import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { UserRole } from "../../src/domain/entities/user"

export const prismaTest = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})


export async function cleanDatabase() {
  await prismaTest.aluno.deleteMany()
  await prismaTest.inviteCode.deleteMany()
  await prismaTest.professor.deleteMany()
  await prismaTest.user.deleteMany()
}


export async function createTestAdmin() {
  const email = `admin-${Date.now()}@test.com` 

  return await prismaTest.user.create({
    data: {
      nome: "Admin Test",
      email,
      password: await hash("admin123", 4),
      role: UserRole.ADMIN,
    },
  })
}


export async function createTestProfessor(especialidade?: string) {
  const email = `professor-${Date.now()}-${Math.random()}@test.com` 

  const user = await prismaTest.user.create({
    data: {
      nome: "Professor Test",
      email,
      password: await hash("professor123", 4),
      role: UserRole.PROFESSOR,
    },
  })

  const professor = await prismaTest.professor.create({
    data: {
      userId: user.id,
      telefone: "11987654321",
      especialidade: especialidade || "Musculação",
      isPadrao: false,
    },
  })

  return { user, professor }
}


export async function createTestProfessorPadrao() {
  const email = `prof-padrao-${Date.now()}@test.com` 

  const user = await prismaTest.user.create({
    data: {
      nome: "Professor Padrão (Sistema)",
      email,
      password: await hash("senha_temporaria_123", 4),
      role: UserRole.PROFESSOR,
    },
  })

  const professor = await prismaTest.professor.create({
    data: {
      userId: user.id,
      especialidade: "Professor padrão - Alunos sem professor específico",
      isPadrao: true,
    },
  })

  return { user, professor }
}


export async function createTestAluno(professorId?: string) {
  const email = `aluno-${Date.now()}-${Math.random()}@test.com` 

  let profId = professorId
  if (!profId) {
    const profPadrao = await createTestProfessorPadrao()
    profId = profPadrao.professor.id
  }

  const user = await prismaTest.user.create({
    data: {
      nome: "Aluno Test",
      email,
      password: await hash("aluno123", 4),
      role: UserRole.ALUNO,
    },
  })

  const aluno = await prismaTest.aluno.create({
    data: {
      userId: user.id,
      professorId: profId,
      telefone: "11999999999",
      alturaCm: 175,
      pesoKg: 75,
      idade: 25,
    },
  })

  return { user, aluno }
}


export async function createTestInviteCode(role: UserRole, createdBy: string) {
  return await prismaTest.inviteCode.create({
    data: {
      code: `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      role,
      createdBy,
      expiresAt: null,
    },
  })
}


export function generateTestToken(data: {
  userId: string
  email: string
  role: UserRole
}): string {
  const jwt = require("jsonwebtoken")
  return jwt.sign(data, process.env.JWT_SECRET!, { expiresIn: "1d" })
}

 
export async function setupTestDatabase() {
  await cleanDatabase()

  const professorPadrao = await prismaTest.professor.findFirst({
    where: { isPadrao: true },
  })

  if (!professorPadrao) {
    await createTestProfessorPadrao()
  }
}


export async function teardownTestDatabase() {
  await cleanDatabase()
  await prismaTest.$disconnect()
}
