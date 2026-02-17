import type { FastifyInstance } from "fastify"
import { prisma } from "../../database/prisma"

export async function rankingRoutes(app: FastifyInstance) {
  app.get("/ranking", async () => {
    const alunos = await prisma.aluno.findMany({
      include: {
        user: {
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: { pontuacao: "desc" },
    })

    return alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.user.nome,
      pontuacao: aluno.pontuacao ?? 0,
    }))
  })
}