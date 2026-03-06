import { FastifyInstance } from "fastify"
import { DietaController } from "../controllers/dieta-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new DietaController()

export async function dietaRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.get("/dietas/alimentos", controller.listAlimentos.bind(controller))
  app.post(
    "/dietas/alimentos",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.createAlimento.bind(controller),
  )
  app.get(
    "/dietas/alimentos/externos",
    controller.searchAlimentosExternos.bind(controller),
  )

  app.post(
    "/dietas/alimentos/importar",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.importAlimentoExterno.bind(controller),
  )

  app.post(
    "/dietas/plano",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.upsertPlano.bind(controller),
  )

  app.get("/dietas/aluno/:alunoId/ativo", controller.getPlanoAtivo.bind(controller))
  app.get(
    "/dietas/aluno/:alunoId/recomendacao",
    controller.getRecomendacao.bind(controller),
  )
  app.get(
    "/dietas/aluno/:alunoId/checkins",
    controller.listCheckins.bind(controller),
  )

  app.post(
    "/dietas/checkins/start",
    { preHandler: [requireRole(UserRole.ALUNO)] },
    controller.startCheckin.bind(controller),
  )

  app.patch(
    "/dietas/checkins/:checkinId/refeicoes/:dietaRefeicaoId",
    { preHandler: [requireRole(UserRole.ALUNO)] },
    controller.updateRefeicaoCheckin.bind(controller),
  )

  app.patch(
    "/dietas/checkins/:checkinId/finalizar",
    { preHandler: [requireRole(UserRole.ALUNO)] },
    controller.finalizeCheckin.bind(controller),
  )

  app.patch(
    "/dietas/checkins/:checkinId/comentario-professor",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.comentarProfessor.bind(controller),
  )
}
