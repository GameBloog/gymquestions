import { FastifyInstance } from "fastify"
import { UserRole } from "@/domain/entities/user"
import { ProfessorOperationsController } from "../controllers/professor-operations-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"

const controller = new ProfessorOperationsController()

export async function professorOperationsRoutes(app: FastifyInstance) {
  const professorOnly = {
    preHandler: [authMiddleware, requireRole(UserRole.PROFESSOR)],
  }

  app.get(
    "/professor/dashboard",
    professorOnly,
    controller.dashboard.bind(controller),
  )
  app.get(
    "/professor/finance/dashboard",
    professorOnly,
    controller.financeDashboard.bind(controller),
  )
}
