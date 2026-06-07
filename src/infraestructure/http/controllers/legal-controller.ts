import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { privacyService } from "@/application/use-cases/privacy/privacy-service"
import { legalAcceptanceSchema } from "../validators/privacy-validator"

export class LegalController {
  async current(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await privacyService.getCurrentDocuments())
  }

  async accept(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = legalAcceptanceSchema.parse(request.body)
      await privacyService.recordAcceptance({
        userId: request.user!.id,
        acceptedDocuments: data.acceptedDocuments,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      })

      return reply.status(201).send({ accepted: true })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues.map((issue) => ({
            campo: issue.path.join("."),
            mensagem: issue.message,
          })),
        })
      }
      throw error
    }
  }
}
