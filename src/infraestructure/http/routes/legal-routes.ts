import { FastifyInstance } from "fastify"
import { LegalController } from "../controllers/legal-controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const controller = new LegalController()

export async function legalRoutes(app: FastifyInstance) {
  app.get("/legal/documents/current", controller.current.bind(controller))
  app.post(
    "/legal/acceptances",
    { preHandler: [authMiddleware] },
    controller.accept.bind(controller)
  )
}
