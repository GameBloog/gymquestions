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
  const adminPassword = "admin123"

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
  console.log("👨‍🏫 Criando professor padrão do sistema...")

  const professorPadraoEmail = "professor.padrao@gym.com"

  // Verifica se já existe um professor padrão (por isPadrao=true)
  let professorPadrao = await prisma.professor.findFirst({
    where: { isPadrao: true },
    include: { user: true },
  })

  if (professorPadrao) {
    console.log(`⚠️  Professor padrão já existe: ${professorPadrao.user.nome}`)
    console.log(`   Email: ${professorPadrao.user.email}`)
    console.log(`   ID: ${professorPadrao.id}\n`)
  } else {
    // Verifica se o usuário já existe (pode ter sido criado sem isPadrao)
    const existingProfPadraoUser = await prisma.user.findUnique({
      where: { email: professorPadraoEmail },
    })

    let professorPadraoUser

    if (existingProfPadraoUser) {
      console.log(
        `⚠️  Usuário ${professorPadraoEmail} já existe, usando existente`
      )
      professorPadraoUser = existingProfPadraoUser

      // Verifica se tem perfil de professor
      const existingProf = await prisma.professor.findUnique({
        where: { userId: existingProfPadraoUser.id },
      })

      if (existingProf) {
        // Atualiza para ser o padrão
        professorPadrao = await prisma.professor.update({
          where: { id: existingProf.id },
          data: { isPadrao: true },
          include: { user: true },
        })
        console.log(`✅ Professor existente marcado como padrão`)
      } else {
        // Cria perfil de professor
        professorPadrao = await prisma.professor.create({
          data: {
            userId: existingProfPadraoUser.id,
            especialidade: "Professor padrão - Alunos sem professor específico",
            isPadrao: true,
          },
          include: { user: true },
        })
        console.log(`✅ Perfil de professor padrão criado`)
      }
    } else {
      // Cria usuário novo
      professorPadraoUser = await prisma.user.create({
        data: {
          nome: "Professor Padrão (Sistema)",
          email: professorPadraoEmail,
          password: await hash("senha_temporaria_123", 10),
          role: "PROFESSOR",
        },
      })

      professorPadrao = await prisma.professor.create({
        data: {
          userId: professorPadraoUser.id,
          especialidade: "Professor padrão - Alunos sem professor específico",
          isPadrao: true,
        },
        include: { user: true },
      })

      console.log(`✅ Professor padrão criado: ${professorPadraoUser.email}`)
      console.log(`   ID: ${professorPadrao.id}\n`)
    }
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
          isPadrao: false,
        },
      })

      console.log(`✅ Professor exemplo criado: ${professorExemploUser.email}`)
      console.log(`🔑 Senha: professor123\n`)
    }
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
  console.log(`Admin: ${adminEmail} / ${adminPassword}`)
  console.log(
    `Professor Padrão: ${professorPadraoEmail} / senha_temporaria_123`
  )

  if (professorPadrao) {
    console.log("\n" + "=".repeat(60))
    console.log("⚙️  PROFESSOR PADRÃO DO SISTEMA")
    console.log("=".repeat(60))
    console.log(`Nome: ${professorPadrao.user.nome}`)
    console.log(`Email: ${professorPadrao.user.email}`)
    console.log(`ID: ${professorPadrao.id}`)
    console.log(`isPadrao: ${professorPadrao.isPadrao}`)
  }

  console.log("=".repeat(60))
  console.log("\n⚠️  IMPORTANTE: Altere todas as senhas após o primeiro login!")
  console.log("✅ Seed concluído com sucesso!\n")

  await prisma.$disconnect()
}
