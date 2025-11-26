import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n")

  // ============================================
  // 1️⃣ CRIAR USUÁRIO ADMIN
  // ============================================
  console.log("👤 Criando usuário Admin...")

  const adminEmail = "admin@gym.com"
  const adminPassword = "admin123" // ⚠️ MUDE ISSO EM PRODUÇÃO!

  // Verifica se admin já existe
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
  // 2️⃣ CRIAR PROFESSOR PADRÃO (para dados migrados)
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
  // 3️⃣ CRIAR PROFESSOR DE EXEMPLO (Opcional - para desenvolvimento)
  // ============================================
  if (process.env.NODE_ENV === "development") {
    console.log(
      "👨‍🏫 Criando professor de exemplo (apenas em desenvolvimento)..."
    )

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

    // ============================================
    // 4️⃣ CRIAR ALUNOS DE EXEMPLO (Opcional - para desenvolvimento)
    // ============================================
    console.log("👥 Criando alunos de exemplo...")

    const alunosExemplo = [
      {
        nome: "João Silva",
        email: "joao.silva@email.com",
        telefone: "11987654321",
        alturaCm: 175,
        pesoKg: 80.5,
        idade: 30,
        cinturaCm: 90,
        quadrilCm: 100,
        pescocoCm: 38,
        alimentos_quer_diario: ["frango", "arroz", "feijão", "batata doce"],
        alimentos_nao_comem: ["carne vermelha"],
        alergias_alimentares: ["lactose"],
        dores_articulares: "Dor leve no joelho esquerdo ao correr",
        suplementos_consumidos: ["whey protein", "creatina", "ômega 3"],
        dias_treino_semana: 5,
        frequencia_horarios_refeicoes: "3 refeições principais + 2 lanches",
      },
      {
        nome: "Maria Santos",
        email: "maria.santos@email.com",
        telefone: "11976543210",
        alturaCm: 165,
        pesoKg: 65.0,
        idade: 28,
        cinturaCm: 75,
        quadrilCm: 95,
        pescocoCm: 32,
        alimentos_quer_diario: ["peixe", "salada", "frutas"],
        alimentos_nao_comem: ["frutos do mar", "glúten"],
        alergias_alimentares: ["amendoim", "camarão"],
        dores_articulares: "Leve dor no ombro direito",
        suplementos_consumidos: ["multivitamínico", "colágeno"],
        dias_treino_semana: 4,
        frequencia_horarios_refeicoes: "5-6 refeições por dia",
      },
      {
        nome: "Pedro Oliveira",
        email: "pedro.oliveira@email.com",
        telefone: "11965432109",
        alturaCm: 180,
        pesoKg: 90.0,
        idade: 35,
        dias_treino_semana: 6,
        alimentos_quer_diario: ["carne", "ovos", "vegetais"],
        alimentos_nao_comem: [],
        alergias_alimentares: [],
        suplementos_consumidos: [
          "whey protein",
          "BCAA",
          "creatina",
          "pré-treino",
        ],
      },
    ]

    for (const alunoData of alunosExemplo) {
      const existingAluno = await prisma.user.findUnique({
        where: { email: alunoData.email },
      })

      if (existingAluno) {
        console.log(`⚠️  Aluno ${alunoData.nome} já existe, pulando...`)
        continue
      }

      const alunoUser = await prisma.user.create({
        data: {
          nome: alunoData.nome,
          email: alunoData.email,
          password: await hash("aluno123", 10),
          role: "ALUNO",
        },
      })

      await prisma.aluno.create({
        data: {
          userId: alunoUser.id,
          professorId: professorExemplo!.id,
          telefone: alunoData.telefone,
          alturaCm: alunoData.alturaCm,
          pesoKg: alunoData.pesoKg,
          idade: alunoData.idade,
          cinturaCm: alunoData.cinturaCm,
          quadrilCm: alunoData.quadrilCm,
          pescocoCm: alunoData.pescocoCm,
          alimentos_quer_diario: alunoData.alimentos_quer_diario,
          alimentos_nao_comem: alunoData.alimentos_nao_comem,
          alergias_alimentares: alunoData.alergias_alimentares,
          dores_articulares: alunoData.dores_articulares,
          suplementos_consumidos: alunoData.suplementos_consumidos,
          dias_treino_semana: alunoData.dias_treino_semana,
          frequencia_horarios_refeicoes:
            alunoData.frequencia_horarios_refeicoes,
        },
      })

      console.log(`✅ Aluno criado: ${alunoData.nome} (${alunoData.email})`)
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
  console.log(`Admin: ${adminEmail} / admin123`)
  console.log(
    `Professor Padrão: ${professorPadraoEmail} / senha_temporaria_123`
  )

  if (process.env.NODE_ENV === "development") {
    console.log(`Professor Exemplo: professor@gym.com / professor123`)
    console.log(`Alunos Exemplo: [email] / aluno123`)
  }

  console.log("=".repeat(60))
  console.log("\n⚠️  IMPORTANTE: Altere todas as senhas após o primeiro login!")
  console.log("✅ Seed concluído com sucesso!\n")
}

main()
  .catch((e) => {
    console.error("\n❌ Erro ao executar seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
