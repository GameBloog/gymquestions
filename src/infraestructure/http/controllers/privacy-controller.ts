import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { privacyService } from "@/application/use-cases/privacy/privacy-service"
import {
  adminRequestParamsSchema,
  dataSubjectRequestSchema,
  privacyPreferencesSchema,
  processDataSubjectRequestSchema,
} from "../validators/privacy-validator"

const zodDetails = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensagem: issue.message,
  }))

export class PrivacyController {
  async getPreferences(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await privacyService.getPreferences(request.user!.id))
  }

  async updatePreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = privacyPreferencesSchema.parse(request.body)
      return reply.send(
        await privacyService.updatePreferences(request.user!.id, data)
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: zodDetails(error),
        })
      }
      throw error
    }
  }

  async createRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = dataSubjectRequestSchema.parse(request.body)
      const created = await privacyService.createRequest(
        request.user!.id,
        data.type,
        data.description
      )
      return reply.status(201).send(created)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: zodDetails(error),
        })
      }
      throw error
    }
  }

  async listRequests(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await privacyService.listRequests(request.user!.id))
  }

  async export(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await privacyService.exportUserData(request.user!.id))
  }

  async listAdminRequests(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await privacyService.listAdminRequests())
  }

  async processAdminRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = adminRequestParamsSchema.parse(request.params)
      const data = processDataSubjectRequestSchema.parse(request.body)
      return reply.send(
        await privacyService.processRequest(
          id,
          request.user!.id,
          data.status,
          data.response
        )
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: zodDetails(error),
        })
      }
      throw error
    }
  }
}
