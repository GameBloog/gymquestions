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

/**
 * Limpa o banco de dados na ordem correta para evitar erros de Foreign Key
 */
export async function cleanDatabase() {
  // Ordem correta: primeiro os dependentes, depois os pais
  await prismaTest.aluno.deleteMany()
  await prismaTest.inviteCode.deleteMany()
  await prismaTest.professor.deleteMany()
  await prismaTest.user.deleteMany()
}

/**
 * Cria um usuário admin para testes
 */
export async function createTestAdmin() {
  const email = `admin-${Date.now()}@test.com` // Email único

  return await prismaTest.user.create({
    data: {
      nome: "Admin Test",
      email,
      password: await hash("admin123", 4),
      role: UserRole.ADMIN,
    },
  })
}

/**
 * Cria um professor para testes
 */
export async function createTestProfessor(especialidade?: string) {
  const email = `professor-${Date.now()}-${Math.random()}@test.com` // Email único

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

/**
 * Cria o professor padrão do sistema
 */
export async function createTestProfessorPadrao() {
  const email = `prof-padrao-${Date.now()}@test.com` // Email único

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

/**
 * Cria um aluno para testes
 */
export async function createTestAluno(professorId?: string) {
  const email = `aluno-${Date.now()}-${Math.random()}@test.com` // Email único

  // Se não forneceu professorId, cria um professor padrão
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

/**
 * Cria um código de convite para testes
 */
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

/**
 * Gera um token JWT para testes
 */
export function generateTestToken(userId: string, role: UserRole): string {
  const jwt = require("jsonwebtoken")
  return jwt.sign(
    { userId, email: "test@test.com", role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  )
}

/**
 * Setup inicial para testes E2E
 */
export async function setupTestDatabase() {
  await cleanDatabase()

  // Criar professor padrão se não existir
  const professorPadrao = await prismaTest.professor.findFirst({
    where: { isPadrao: true },
  })

  if (!professorPadrao) {
    await createTestProfessorPadrao()
  }
}

/**
 * Teardown após testes E2E
 */
export async function teardownTestDatabase() {
  await cleanDatabase()
  await prismaTest.$disconnect()
}
