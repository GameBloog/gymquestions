import { FastifyInstance } from "fastify"
import { LeadLinkController } from "../controllers/lead-link-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new LeadLinkController()

export async function leadLinkRoutes(app: FastifyInstance) {
  app.post(
    "/lead-links/click",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: 60_000,
        },
      },
    },
    controller.trackClick.bind(controller),
  )

  const adminOnly = {
    preHandler: [authMiddleware, requireRole(UserRole.ADMIN)],
  }

  app.post("/lead-links", adminOnly, controller.create.bind(controller))
  app.get("/lead-links", adminOnly, controller.list.bind(controller))
  app.get(
    "/lead-links/analytics",
    adminOnly,
    controller.analytics.bind(controller),
  )
  app.patch("/lead-links/:id", adminOnly, controller.update.bind(controller))
}
