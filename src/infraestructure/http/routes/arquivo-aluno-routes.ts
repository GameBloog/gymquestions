import { FastifyInstance } from "fastify"
import { ArquivoAlunoController } from "../controllers/arquivo-aluno-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new ArquivoAlunoController()

export async function arquivoAlunoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  // Upload de treino/dieta (apenas professor e admin)
  app.post(
    "/arquivos-aluno",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.upload.bind(controller)
  )

  // Listar arquivos de um aluno
  app.get("/arquivos-aluno/aluno/:alunoId", controller.list.bind(controller))

  // Deletar arquivo
  app.delete(
    "/arquivos-aluno/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.delete.bind(controller)
  )
}
