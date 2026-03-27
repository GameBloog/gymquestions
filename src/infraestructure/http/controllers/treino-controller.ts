import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { PlanoTreinoService } from "@/application/use-cases/treino/plano-treino-service"
import { TreinoModeloService } from "@/modules/treino-modelos/application/treino-modelo-service"
import {
  alunoIdParamsSchema,
  comentarioProfessorBodySchema,
  createTreinoModeloSchema,
  finalizeCheckinBodySchema,
  finalizeCheckinParamsSchema,
  progressoQuerySchema,
  startCheckinSchema,
  timelineQuerySchema,
  treinoModeloIdParamsSchema,
  upsertPlanoTreinoSchema,
  updateExercicioCheckinBodySchema,
  updateExercicioCheckinParamsSchema,
} from "../validators/treino-validator"

const treinoService = new PlanoTreinoService()
const treinoModeloService = new TreinoModeloService()

export class TreinoController {
  async upsertPlano(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = upsertPlanoTreinoSchema.parse(request.body)
      const user = request.user!

      const plano = await treinoService.upsertPlanoTreino(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(plano)
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

  async getPlanoAtivo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = alunoIdParamsSchema.parse(request.params)
      const user = request.user!

      const plano = await treinoService.getPlanoAtivoByAluno(alunoId, {
        userId: user.id,
        role: user.role,
      })

      if (!plano) {
        return reply.status(404).send({
          error: "Nenhum plano de treino ativo encontrado",
        })
      }

      return reply.send(plano)
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

  async createModelo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createTreinoModeloSchema.parse(request.body)
      const user = request.user!

      const modelo = await treinoModeloService.create(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(modelo)
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

  async listModelos(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user!

    const modelos = await treinoModeloService.list({
      userId: user.id,
      role: user.role,
    })

    return reply.send(modelos)
  }

  async getModelo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { moldeId } = treinoModeloIdParamsSchema.parse(request.params)
      const user = request.user!

      const modelo = await treinoModeloService.getById(
        { userId: user.id, role: user.role },
        moldeId,
      )

      return reply.send(modelo)
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

  async startCheckin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = startCheckinSchema.parse(request.body)
      const user = request.user!

      const checkin = await treinoService.startCheckin(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(checkin)
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

  async updateExercicioCheckin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = updateExercicioCheckinParamsSchema.parse(request.params)
      const data = updateExercicioCheckinBodySchema.parse(request.body)
      const user = request.user!

      const updated = await treinoService.updateExercicioCheckin(
        { userId: user.id, role: user.role },
        {
          ...params,
          ...data,
        },
      )

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

  async finalizeCheckin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = finalizeCheckinParamsSchema.parse(request.params)
      const data = finalizeCheckinBodySchema.parse(request.body)
      const user = request.user!

      const checkin = await treinoService.finalizeCheckin(
        { userId: user.id, role: user.role },
        {
          ...params,
          ...data,
        },
      )

      return reply.send(checkin)
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

  async comentarProfessor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = finalizeCheckinParamsSchema.parse(request.params)
      const data = comentarioProfessorBodySchema.parse(request.body)
      const user = request.user!

      const checkin = await treinoService.comentarCheckinComoProfessor(
        { userId: user.id, role: user.role },
        {
          checkinId: params.checkinId,
          comentarioProfessor: data.comentarioProfessor,
        },
      )

      return reply.send(checkin)
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

  async listCheckins(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = alunoIdParamsSchema.parse(request.params)
      const query = timelineQuerySchema.parse(request.query)
      const user = request.user!

      const data = await treinoService.listCheckinsByAluno(
        { userId: user.id, role: user.role },
        alunoId,
        query.limit ?? 50,
      )

      return reply.send(data)
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

  async timeline(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = alunoIdParamsSchema.parse(request.params)
      const query = timelineQuerySchema.parse(request.query)
      const user = request.user!

      const timeline = await treinoService.getTimelineByAluno(
        { userId: user.id, role: user.role },
        alunoId,
        query.limit ?? 80,
      )

      return reply.send(timeline)
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

  async progresso(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = alunoIdParamsSchema.parse(request.params)
      const query = progressoQuerySchema.parse(request.query)
      const user = request.user!

      const progresso = await treinoService.getProgressByAluno(
        { userId: user.id, role: user.role },
        alunoId,
        query.exercicioId,
      )

      return reply.send(progresso)
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
}
