import { FastifyInstance } from "fastify"
import { FotoShapeController } from "../controllers/foto-shape-controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const controller = new FotoShapeController()

export async function fotoShapeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  // Upload de foto (apenas alunos)
  app.post("/fotos-shape", controller.upload.bind(controller))

  // Listar fotos de um aluno
  app.get("/fotos-shape/aluno/:alunoId", controller.list.bind(controller))

  // Deletar foto
  app.delete("/fotos-shape/:id", controller.delete.bind(controller))
}
