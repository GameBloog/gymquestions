import { FastifyInstance } from "fastify"
import { FotoShapeController } from "../controllers/foto-shape-controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const controller = new FotoShapeController()

export async function fotoShapeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.post("/fotos-shape", controller.upload.bind(controller))

  app.get("/fotos-shape/aluno/:alunoId", controller.list.bind(controller))

  app.delete("/fotos-shape/:id", controller.delete.bind(controller))
}
