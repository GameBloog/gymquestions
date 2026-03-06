import { FastifyInstance } from "fastify"
import { ExercicioController } from "../controllers/exercicio-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new ExercicioController()

export async function exercicioRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.get("/exercicios", controller.list.bind(controller))
  app.get("/exercicios/grupamentos", controller.listGrupamentos.bind(controller))
  app.get("/exercicios/externos", controller.searchExternal.bind(controller))

  app.post(
    "/exercicios",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.create.bind(controller),
  )

  app.post(
    "/exercicios/importar",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.importExternal.bind(controller),
  )
}
