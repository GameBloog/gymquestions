import { FastifyInstance } from "fastify"
import { FinanceController } from "../controllers/finance-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new FinanceController()

export async function financeRoutes(app: FastifyInstance) {
  const adminOnly = {
    preHandler: [authMiddleware, requireRole(UserRole.ADMIN)],
  }

  // Professor pode gerenciar renovações dos próprios alunos e lançamentos
  // manuais próprios (ownership escopada dentro do controller/service).
  const adminOrProfessor = {
    preHandler: [authMiddleware, requireRole(UserRole.ADMIN, UserRole.PROFESSOR)],
  }

  app.get("/finance/dashboard", adminOnly, controller.dashboard.bind(controller))

  app.get("/finance/renewals", adminOnly, controller.listRenewals.bind(controller))
  app.post("/finance/renewals", adminOrProfessor, controller.createRenewal.bind(controller))
  app.patch(
    "/finance/renewals/:id",
    adminOrProfessor,
    controller.updateRenewal.bind(controller),
  )
  app.delete(
    "/finance/renewals/:id",
    adminOrProfessor,
    controller.deleteRenewal.bind(controller),
  )

  app.get("/finance/entries", adminOrProfessor, controller.listEntries.bind(controller))
  app.post("/finance/entries", adminOrProfessor, controller.createEntry.bind(controller))
  app.patch("/finance/entries/:id", adminOrProfessor, controller.updateEntry.bind(controller))
  app.delete("/finance/entries/:id", adminOrProfessor, controller.deleteEntry.bind(controller))

  app.patch(
    "/finance/months/:month/close",
    adminOnly,
    controller.closeMonth.bind(controller),
  )
  app.patch(
    "/finance/months/:month/reopen",
    adminOnly,
    controller.reopenMonth.bind(controller),
  )
}
