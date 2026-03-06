import { FastifyInstance } from "fastify"
import { TreinoController } from "../controllers/treino-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new TreinoController()

export async function treinoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.post(
    "/treinos/plano",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.upsertPlano.bind(controller),
  )

  app.get("/treinos/aluno/:alunoId/ativo", controller.getPlanoAtivo.bind(controller))
  app.get("/treinos/aluno/:alunoId/checkins", controller.listCheckins.bind(controller))
  app.get("/treinos/aluno/:alunoId/timeline", controller.timeline.bind(controller))
  app.get("/treinos/aluno/:alunoId/progresso", controller.progresso.bind(controller))

  app.post(
    "/treinos/checkins/start",
    { preHandler: [requireRole(UserRole.ALUNO)] },
    controller.startCheckin.bind(controller),
  )

  app.patch(
    "/treinos/checkins/:checkinId/exercicios/:treinoDiaExercicioId",
    { preHandler: [requireRole(UserRole.ALUNO)] },
    controller.updateExercicioCheckin.bind(controller),
  )

  app.patch(
    "/treinos/checkins/:checkinId/finalizar",
    { preHandler: [requireRole(UserRole.ALUNO)] },
    controller.finalizeCheckin.bind(controller),
  )

  app.patch(
    "/treinos/checkins/:checkinId/comentario-professor",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.comentarProfessor.bind(controller),
  )
}
