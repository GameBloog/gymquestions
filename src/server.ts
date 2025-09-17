import Fastify from "fastify"
import dotenv from "dotenv"
import cors from "@fastify/cors"
import { PrismaClient } from "@prisma/client"

dotenv.config()

const prisma = new PrismaClient()
const app = Fastify({ logger: true })

async function main() {
  await app.register(cors, { origin: true })

  const PORT = Number(process.env.PORT || 3333)

  app.post("/answers", async (request, reply) => {
    try {
      const payload = request.body as any

      if (!payload?.nome || !payload?.email) {
        return reply
          .status(400)
          .send({ error: "nome e email são obrigatorios" })
      }

      const created = await prisma.userAnswer.create({
        data: {
          nome: payload.nome,
          email: payload.email,
          telefone: payload.telefone ?? null,
          alturaCm: payload.alturaCm ?? null,
          pesoKg: payload.pesoKg ?? null,
          idade: payload.idade ?? null,
          cinturaCm: payload.cinturaCm ?? null,
          quadrilCm: payload.quadrilCm ?? null,
          pescocoCm: payload.pescocoCm ?? null,
          alimentos_quer_diario: payload.alimentos_quer_diario ?? null,
          alimentos_nao_comem: payload.alimentos_nao_comem ?? null,
          alergias_alimentares: payload.alergias_alimentares ?? null,
          dores_articulares: payload.dores_articulares ?? null,
          suplementos_consumidos: payload.suplementos_consumidos ?? null,
          dias_treino_semana: payload.dias_treino_semana ?? null,
          frequencia_horarios_refeicoes:
            payload.frequencia_horarios_refeicoes ?? null,
        },
      })

      return reply.status(201).send(created)
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send({ error: "erro ao salvar resposta" })
    }
  })

  app.get("/answers", async (request, reply) => {
    const list = await prisma.userAnswer.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return reply.send(list)
  })

  process.on("SIGINT", async () => {
    await prisma.$disconnect()
    process.exit(0)
  })

  await app.listen({ port: PORT, host: "0.0.0.0" })
  app.log.info(`Servidor rodando em http://localhost:${PORT}`)
}

main().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
