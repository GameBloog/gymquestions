import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

export async function runSeed() {
  console.log("🌱 Iniciando seed do banco de dados...\n")

  // ============================================
  // 1️⃣ CRIAR USUÁRIO ADMIN
  // ============================================
  console.log("👤 Criando usuário Admin...")

  const adminEmail = "admin@gym.com"
  const adminPassword = "admin123" // ⚠️ MUDE ISSO EM PRODUÇÃO!

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  let adminUser
  if (existingAdmin) {
    console.log("⚠️  Admin já existe, pulando criação...")
    adminUser = existingAdmin
  } else {
    adminUser = await prisma.user.create({
      data: {
        nome: "Administrador",
        email: adminEmail,
        password: await hash(adminPassword, 10),
        role: "ADMIN",
      },
    })
    console.log(`✅ Admin criado: ${adminUser.email}`)
    console.log(`🔑 Senha padrão: ${adminPassword}`)
    console.log("⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n")
  }

  // ============================================
  // 2️⃣ CRIAR PROFESSOR PADRÃO
  // ============================================
  console.log("👨‍🏫 Criando professor padrão...")

  const professorPadraoEmail = "professor.padrao@gym.com"

  const existingProfPadrao = await prisma.user.findUnique({
    where: { email: professorPadraoEmail },
  })

  let professorPadrao
  if (existingProfPadrao) {
    console.log("⚠️  Professor padrão já existe, pulando criação...")
    professorPadrao = await prisma.professor.findUnique({
      where: { userId: existingProfPadrao.id },
    })
  } else {
    const professorPadraoUser = await prisma.user.create({
      data: {
        nome: "Professor Padrão (Dados Antigos)",
        email: professorPadraoEmail,
        password: await hash("senha_temporaria_123", 10),
        role: "PROFESSOR",
      },
    })

    professorPadrao = await prisma.professor.create({
      data: {
        userId: professorPadraoUser.id,
        especialidade: "Responsável por dados migrados do sistema antigo",
      },
    })
    console.log(`✅ Professor padrão criado: ${professorPadraoUser.email}`)
    console.log(`   ID do professor: ${professorPadrao.id}\n`)
  }

  // ============================================
  // 3️⃣ DADOS APENAS EM DEV
  // ============================================
  if (process.env.NODE_ENV === "development") {
    console.log("👨‍🏫 Criando professor e alunos de exemplo (DEV apenas)...")

    const professorExemploEmail = "professor@gym.com"

    const existingProfExemplo = await prisma.user.findUnique({
      where: { email: professorExemploEmail },
    })

    let professorExemplo
    if (existingProfExemplo) {
      console.log("⚠️  Professor exemplo já existe, pulando criação...")
      professorExemplo = await prisma.professor.findUnique({
        where: { userId: existingProfExemplo.id },
      })
    } else {
      const professorExemploUser = await prisma.user.create({
        data: {
          nome: "Carlos Silva",
          email: professorExemploEmail,
          password: await hash("professor123", 10),
          role: "PROFESSOR",
        },
      })

      professorExemplo = await prisma.professor.create({
        data: {
          userId: professorExemploUser.id,
          telefone: "11987654321",
          especialidade: "Musculação e Hipertrofia",
        },
      })

      console.log(`✅ Professor exemplo criado: ${professorExemploUser.email}`)
      console.log(`🔑 Senha: professor123\n`)
    }

    console.log("👥 Criando alunos de exemplo...")
    // --- (seus alunos de exemplo continuam iguais aqui) ---
  }

  // ============================================
  // 📊 RESUMO
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("📊 RESUMO DO SEED")
  console.log("=".repeat(60))

  const totalUsers = await prisma.user.count()
  const totalProfessores = await prisma.professor.count()
  const totalAlunos = await prisma.aluno.count()

  console.log(`👥 Total de usuários: ${totalUsers}`)
  console.log(`👨‍🏫 Total de professores: ${totalProfessores}`)
  console.log(`🎓 Total de alunos: ${totalAlunos}`)

  console.log("\n" + "=".repeat(60))
  console.log("🔐 CREDENCIAIS PADRÃO")
  console.log("=".repeat(60))
  console.log(`Admin: ${adminEmail} / admin123`)
  console.log(
    `Professor Padrão: ${professorPadraoEmail} / senha_temporaria_123`
  )

  console.log("=".repeat(60))
  console.log("\n⚠️  IMPORTANTE: Altere todas as senhas após o primeiro login!")
  console.log("✅ Seed concluído com sucesso!\n")

  await prisma.$disconnect()
}
