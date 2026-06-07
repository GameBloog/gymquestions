import { FastifyInstance } from "fastify"
import { PrivacyController } from "../controllers/privacy-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new PrivacyController()

export async function privacyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.get("/privacy/preferences", controller.getPreferences.bind(controller))
  app.put("/privacy/preferences", controller.updatePreferences.bind(controller))
  app.post("/privacy/requests", controller.createRequest.bind(controller))
  app.get("/privacy/requests", controller.listRequests.bind(controller))
  app.get("/privacy/export", controller.export.bind(controller))

  app.get(
    "/privacy/admin/requests",
    { preHandler: [requireRole(UserRole.ADMIN)] },
    controller.listAdminRequests.bind(controller)
  )
  app.patch(
    "/privacy/admin/requests/:id",
    { preHandler: [requireRole(UserRole.ADMIN)] },
    controller.processAdminRequest.bind(controller)
  )
}
