import { FastifyInstance } from "fastify"
import { AuthController } from "../controllers/auth.controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const controller = new AuthController()

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", controller.register.bind(controller))
  app.post("/auth/login", controller.login.bind(controller))

  app.get(
    "/auth/me",
    { preHandler: [authMiddleware] },
    controller.me.bind(controller)
  )
}
