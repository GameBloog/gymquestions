import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { ProfessorDashboardService } from "@/application/use-cases/professor-dashboard/professor-dashboard-service"
import { ProfessorFinanceService } from "@/application/use-cases/professor-finance/professor-finance-service"
import {
  professorDashboardQuerySchema,
  professorFinanceDashboardQuerySchema,
} from "../validators/professor-operations-validator"

const dashboardService = new ProfessorDashboardService()
const financeService = new ProfessorFinanceService()

export class ProfessorOperationsController {
  async dashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = professorDashboardQuerySchema.parse(request.query)
      const payload = await dashboardService.getDashboard({
        userId: request.user!.id,
        ...query,
      })

      return reply.send(payload)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async financeDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = professorFinanceDashboardQuerySchema.parse(request.query)
      const payload = await financeService.getDashboard({
        userId: request.user!.id,
        ...query,
      })

      return reply.send(payload)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  private handleValidationError(error: unknown, reply: FastifyReply) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: error.issues,
      })
    }

    throw error
  }
}
