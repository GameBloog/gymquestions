import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...")

  // Limpar dados existentes (opcional - cuidado em produção!)
  // await prisma.userAnswer.deleteMany()

  // Criar dados de exemplo
  const answer1 = await prisma.userAnswer.create({
    data: {
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
  })

  const answer2 = await prisma.userAnswer.create({
    data: {
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
  })

  const answer3 = await prisma.userAnswer.create({
    data: {
      nome: "Pedro Oliveira",
      email: "pedro.oliveira@email.com",
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
  })

  console.log("✅ Seed concluído com sucesso!")
  console.log(`📝 Criadas ${3} respostas de exemplo:`)
  console.log(`   - ${answer1.nome} (${answer1.email})`)
  console.log(`   - ${answer2.nome} (${answer2.email})`)
  console.log(`   - ${answer3.nome} (${answer3.email})`)
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
