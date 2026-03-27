import { FastifyInstance } from "fastify"
import { AuthController } from "../controllers/auth.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"
import { env } from "@/env"

const controller = new AuthController()

export async function authRoutes(app: FastifyInstance) {
  const authRateLimitConfig = {
    config: {
      rateLimit: {
        max: env.AUTH_RATE_LIMIT_MAX,
        timeWindow: env.AUTH_RATE_LIMIT_TIMEWINDOW,
      },
    },
  }

  app.post(
    "/auth/register",
    authRateLimitConfig,
    controller.register.bind(controller)
  )
  app.post("/auth/login", authRateLimitConfig, controller.login.bind(controller))

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
