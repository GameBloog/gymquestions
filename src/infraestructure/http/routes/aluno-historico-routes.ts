import { FastifyInstance } from "fastify"
import { AlunoHistoricoController } from "../controllers/aluno-history-contoller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new AlunoHistoricoController()

export async function alunoHistoricoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.post(
    "/alunos/:alunoId/historico",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.create.bind(controller)
  )

  app.get("/alunos/:alunoId/historico", controller.listByAluno.bind(controller))

  app.get(
    "/alunos/:alunoId/historico/latest",
    controller.getLatest.bind(controller)
  )

  app.put(
    "/historico/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.update.bind(controller)
  )

  app.delete(
    "/historico/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.delete.bind(controller)
  )
}
