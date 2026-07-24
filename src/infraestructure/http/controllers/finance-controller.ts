import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { FinanceService } from "@/application/use-cases/finance/finance-service"
import { PrismaProfessorRepository } from "@/infraestructure/database/respositories/prisma-professor-repository"
import { UserRole } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"
import {
  createFinanceEntrySchema,
  createFinanceRenewalSchema,
  financeDashboardQuerySchema,
  financeEntriesQuerySchema,
  financeEntryParamsSchema,
  financeMonthParamsSchema,
  financeRenewalParamsSchema,
  financeRenewalsQuerySchema,
  updateFinanceEntrySchema,
  updateFinanceRenewalSchema,
} from "../validators/finance-validator"

const service = new FinanceService()
const professorRepository = new PrismaProfessorRepository()

export class FinanceController {
  /**
   * Retorna o id do Professor autenticado quando a role é PROFESSOR (para
   * escopar ownership), ou undefined quando é ADMIN (sem restrição — RN4).
   */
  private async resolveProfessorId(request: FastifyRequest): Promise<string | undefined> {
    if (request.user!.role !== UserRole.PROFESSOR) {
      return undefined
    }

    const professor = await professorRepository.findByUserId(request.user!.id)

    if (!professor) {
      throw new AppError("Professor não encontrado", 404)
    }

    return professor.id
  }

  async dashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = financeDashboardQuerySchema.parse(request.query)
      const payload = await service.getDashboard(query)
      return reply.send(payload)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async listRenewals(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = financeRenewalsQuerySchema.parse(request.query)
      const renewals = await service.listRenewals(query)
      return reply.send(renewals)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async createRenewal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createFinanceRenewalSchema.parse(request.body)
      const professorId = await this.resolveProfessorId(request)
      const created = await service.createRenewal(request.user!.id, data, professorId)
      return reply.status(201).send(created)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async updateRenewal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = financeRenewalParamsSchema.parse(request.params)
      const data = updateFinanceRenewalSchema.parse(request.body)
      const professorId = await this.resolveProfessorId(request)
      const updated = await service.updateRenewal(id, data, professorId)
      return reply.send(updated)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async deleteRenewal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = financeRenewalParamsSchema.parse(request.params)
      const professorId = await this.resolveProfessorId(request)
      await service.deleteRenewal(id, professorId)
      return reply.status(204).send()
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async listEntries(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = financeEntriesQuerySchema.parse(request.query)
      const professorId = await this.resolveProfessorId(request)
      const entries = await service.listEntries(query, professorId)
      return reply.send(entries)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async createEntry(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createFinanceEntrySchema.parse(request.body)
      const professorId = await this.resolveProfessorId(request)
      const created = await service.createEntry(request.user!.id, data, professorId ?? null)
      return reply.status(201).send(created)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async updateEntry(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = financeEntryParamsSchema.parse(request.params)
      const data = updateFinanceEntrySchema.parse(request.body)
      const professorId = await this.resolveProfessorId(request)
      const updated = await service.updateEntry(id, data, professorId)
      return reply.send(updated)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async deleteEntry(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = financeEntryParamsSchema.parse(request.params)
      const professorId = await this.resolveProfessorId(request)
      await service.deleteEntry(id, professorId)
      return reply.status(204).send()
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async closeMonth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { month } = financeMonthParamsSchema.parse(request.params)
      const updated = await service.closeMonth(month, request.user!.id)
      return reply.send(updated)
    } catch (error) {
      return this.handleValidationError(error, reply)
    }
  }

  async reopenMonth(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { month } = financeMonthParamsSchema.parse(request.params)
      const updated = await service.reopenMonth(month, request.user!.id)
      return reply.send(updated)
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
