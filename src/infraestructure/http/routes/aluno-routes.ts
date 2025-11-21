import { FastifyInstance } from "fastify"
import { AlunoController } from "../controllers/aluno-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new AlunoController()

export async function alunoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.post(
    "/alunos",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.create.bind(controller)
  )

  app.get("/alunos", controller.list.bind(controller))

  app.get("/alunos/:id", controller.getById.bind(controller))

  app.put("/alunos/:id", controller.update.bind(controller))

  app.delete(
    "/alunos/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.delete.bind(controller)
  )
}
