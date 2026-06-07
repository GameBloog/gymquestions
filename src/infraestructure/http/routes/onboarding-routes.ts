import { FastifyInstance } from "fastify"
import { OnboardingController } from "../controllers/onboarding-controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const controller = new OnboardingController()

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.get("/onboarding", controller.get.bind(controller))
  app.post("/onboarding/progress", controller.progress.bind(controller))
  app.post("/onboarding/complete", controller.complete.bind(controller))
  app.post("/onboarding/dismiss", controller.dismiss.bind(controller))
  app.post("/onboarding/restart", controller.restart.bind(controller))
  app.post(
    "/onboarding/checklist/complete",
    controller.completeChecklistItem.bind(controller)
  )
}
