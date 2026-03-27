import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { LeadLinkService } from "@/application/use-cases/lead-link/lead-link-service"
import {
  analyticsLeadLinksQuerySchema,
  createLeadLinkSchema,
  leadLinkIdParamsSchema,
  listLeadLinksQuerySchema,
  trackLeadClickSchema,
  updateLeadLinkSchema,
} from "../validators/lead-link-validator"

const service = new LeadLinkService()

export class LeadLinkController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createLeadLinkSchema.parse(request.body)
      const createdBy = request.user!.id

      const link = await service.createLeadLink(createdBy, data)

      return reply.status(201).send(link)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues,
        })
      }
      throw error
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = listLeadLinksQuerySchema.parse(request.query)
      const links = await service.listLeadLinks(query)

      return reply.send(links)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Parâmetros inválidos",
          details: error.issues,
        })
      }
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = leadLinkIdParamsSchema.parse(request.params)
      const data = updateLeadLinkSchema.parse(request.body)

      const updated = await service.updateLeadLink(id, data)

      return reply.send(updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues,
        })
      }
      throw error
    }
  }

  async analytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = analyticsLeadLinksQuerySchema.parse(request.query)
      const analytics = await service.getAnalytics(query)

      return reply.send(analytics)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Parâmetros inválidos",
          details: error.issues,
        })
      }
      throw error
    }
  }

  async trackClick(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = trackLeadClickSchema.parse(request.body)
      const userAgent = request.headers["user-agent"]

      const result = await service.trackClick(data, {
        ip: request.ip,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
      })

      return reply.status(result.tracked ? 201 : 200).send(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues,
        })
      }
      throw error
    }
  }
}
