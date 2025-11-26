import { FastifyInstance } from "fastify"
import { ProfessorController } from "../controllers/professor-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new ProfessorController()

export async function professorRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.post(
    "/professores",
    { preHandler: [requireRole(UserRole.ADMIN)] },
    controller.create.bind(controller)
  )

  app.get("/professores", controller.list.bind(controller))

  app.get("/professores/:id", controller.getById.bind(controller))

  app.put(
    "/professores/:id",
    { preHandler: [requireRole(UserRole.ADMIN)] },
    controller.update.bind(controller)
  )

  app.delete(
    "/professores/:id",
    { preHandler: [requireRole(UserRole.ADMIN)] },
    controller.delete.bind(controller)
  )
}
