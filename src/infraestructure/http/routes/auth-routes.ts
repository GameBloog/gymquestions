import { FastifyInstance } from "fastify"
import { AuthController } from "../controllers/auth.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new AuthController()

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", controller.register.bind(controller))
  app.post("/auth/login", controller.login.bind(controller))

  app.get(
    "/auth/me",
    { preHandler: [authMiddleware] },
    controller.me.bind(controller)
  )

  app.post(
    "/auth/invite-codes",
    { preHandler: [authMiddleware, requireRole(UserRole.ADMIN)] },
    controller.createInviteCode.bind(controller)
  )

  app.get(
    "/auth/invite-codes",
    { preHandler: [authMiddleware, requireRole(UserRole.ADMIN)] },
    controller.listInviteCodes.bind(controller)
  )
}
