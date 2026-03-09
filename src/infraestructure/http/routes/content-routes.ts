import { FastifyInstance } from "fastify"
import { ContentController } from "../controllers/content-controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const controller = new ContentController()

export async function contentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.get(
    "/content/youtube/latest",
    controller.latestYoutubeVideo.bind(controller),
  )
}
