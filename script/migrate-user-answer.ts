import { Prisma, PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function migrate() {
  console.log("🔄 Iniciando migração de UserAnswers para Alunos...\n")

  try {
    let defaultProfessor = await prisma.professor.findFirst({
      where: {
        user: {
          email: "professor.padrao@gym.com",
        },
      },
    })

    if (!defaultProfessor) {
      console.log("📝 Criando professor padrão...")

      const defaultProfessorUser = await prisma.user.create({
        data: {
          nome: "Professor Padrão (Dados Antigos)",
          email: "professor.padrao@gym.com",
          password: await hash("senha_temporaria_123", 10),
          role: "PROFESSOR",
        },
      })

      defaultProfessor = await prisma.professor.create({
        data: {
          userId: defaultProfessorUser.id,
          especialidade: "Responsável por dados migrados",
        },
      })

      console.log("✅ Professor padrão criado!\n")
    } else {
      console.log("✅ Professor padrão já existe!\n")
    }

    const userAnswers = await prisma.userAnswer.findMany()

    if (userAnswers.length === 0) {
      console.log("ℹ️  Nenhum dado antigo para migrar.\n")
      return
    }

    console.log(
      `📊 Encontradas ${userAnswers.length} respostas antigas para migrar...\n`
    )

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const answer of userAnswers) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: answer.email },
        })

        if (existingUser) {
          console.log(`⚠️  Email ${answer.email} já existe, pulando...`)
          skipped++
          continue
        }

        // Criar User
        const user = await prisma.user.create({
          data: {
            nome: answer.nome,
            email: answer.email,
            password: await hash("senha_temporaria_123", 10), 
            role: "ALUNO",
          },
        })

        await prisma.aluno.create({
          data: {
            userId: user.id,
            professorId: defaultProfessor.id,
            telefone: answer.telefone,
            alturaCm: answer.alturaCm,
            pesoKg: answer.pesoKg,
            idade: answer.idade,
            cinturaCm: answer.cinturaCm,
            quadrilCm: answer.quadrilCm,
            pescocoCm: answer.pescocoCm,
            alimentos_quer_diario:
              answer.alimentos_quer_diario ?? Prisma.JsonNull,
            alimentos_nao_comem: answer.alimentos_nao_comem ?? Prisma.JsonNull,
            alergias_alimentares:
              answer.alergias_alimentares ?? Prisma.JsonNull,
            dores_articulares: answer.dores_articulares,
            suplementos_consumidos:
              answer.suplementos_consumidos ?? Prisma.JsonNull,
            dias_treino_semana: answer.dias_treino_semana,
            frequencia_horarios_refeicoes: answer.frequencia_horarios_refeicoes,
          },
        })

        console.log(`✅ Migrado: ${answer.nome} (${answer.email})`)
        migrated++
      } catch (error) {
        console.error(`❌ Erro ao migrar ${answer.email}:`, error)
        errors++
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log("📊 RESUMO DA MIGRAÇÃO:")
    console.log("=".repeat(60))
    console.log(`✅ Migrados com sucesso: ${migrated}`)
    console.log(`⚠️  Pulados (email já existe): ${skipped}`)
    console.log(`❌ Erros: ${errors}`)
    console.log(`📝 Total processado: ${userAnswers.length}`)
    console.log("=".repeat(60) + "\n")

    if (migrated > 0) {
      console.log(
        '⚠️  IMPORTANTE: Todos os alunos migrados receberam a senha temporária: "senha_temporaria_123"'
      )
      console.log("⚠️  Envie emails para que alterem suas senhas!\n")
      console.log(
        `📧 Professor padrão criado com email: professor.padrao@gym.com`
      )
      console.log(`🔑 Senha do professor padrão: senha_temporaria_123\n`)
    }

    console.log("✅ Migração concluída com sucesso!")
  } catch (error) {
    console.error("❌ Erro fatal durante migração:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
  .then(() => {
    console.log("\n👋 Script finalizado.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Erro:", error)
    process.exit(1)
  })
