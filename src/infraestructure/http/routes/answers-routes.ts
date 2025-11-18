import { FastifyInstance } from "fastify"
import { AnswerController } from "../controllers/answers-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new AnswerController()

export async function answersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.post(
    "/answers",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.create.bind(controller)
  )

  app.get("/answers", controller.list.bind(controller))

  app.get("/answers/:id", controller.getById.bind(controller))

  app.put(
    "/answers/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.update.bind(controller)
  )

  app.delete(
    "/answers/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.delete.bind(controller)
  )
}
