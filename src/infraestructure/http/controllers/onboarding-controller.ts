import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { onboardingService } from "@/application/use-cases/onboarding/onboarding-service"
import {
  onboardingChecklistItemSchema,
  onboardingProgressSchema,
} from "../validators/onboarding-validator"

const authContext = (request: FastifyRequest) => ({
  userId: request.user!.id,
  role: request.user!.role as unknown as UserRole,
})

const zodDetails = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensagem: issue.message,
  }))

export class OnboardingController {
  async get(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await onboardingService.get(authContext(request)))
  }

  async progress(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = onboardingProgressSchema.parse(request.body)
      return reply.send(
        await onboardingService.progress(
          authContext(request),
          data.currentStepKey
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

  async complete(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await onboardingService.complete(authContext(request)))
  }

  async dismiss(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await onboardingService.dismiss(authContext(request)))
  }

  async restart(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await onboardingService.restart(authContext(request)))
  }

  async completeChecklistItem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = onboardingChecklistItemSchema.parse(request.body)
      return reply.send(
        await onboardingService.completeChecklistItem(
          authContext(request),
          data.key
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
