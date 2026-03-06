import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { AlimentoService } from "@/application/use-cases/dieta/alimento-service"
import { PlanoDietaService } from "@/application/use-cases/dieta/plano-dieta-service"
import {
  alunoIdParamsSchema,
  comentarioProfessorBodySchema,
  createAlimentoSchema,
  finalizeDietaCheckinBodySchema,
  finalizeDietaCheckinParamsSchema,
  importAlimentoExternoSchema,
  listAlimentosQuerySchema,
  listCheckinsQuerySchema,
  recomendacaoQuerySchema,
  searchAlimentosExternosQuerySchema,
  startDietaCheckinSchema,
  updateRefeicaoCheckinBodySchema,
  updateRefeicaoCheckinParamsSchema,
  upsertPlanoDietaSchema,
} from "../validators/dieta-validator"

const alimentoService = new AlimentoService()
const planoDietaService = new PlanoDietaService()

export class DietaController {
  async listAlimentos(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = listAlimentosQuerySchema.parse(request.query)
      const user = request.user!

      const alimentos = await alimentoService.listAlimentos(
        { userId: user.id, role: user.role },
        query,
      )

      return reply.send(alimentos)
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

  async createAlimento(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createAlimentoSchema.parse(request.body)
      const user = request.user!

      const alimento = await alimentoService.createProfessorAlimento(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(alimento)
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

  async searchAlimentosExternos(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = searchAlimentosExternosQuerySchema.parse(request.query)
      const alimentos = await alimentoService.searchExternal(query)

      return reply.send(alimentos)
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

  async importAlimentoExterno(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = importAlimentoExternoSchema.parse(request.body)
      const user = request.user!

      const alimento = await alimentoService.importExternal(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(alimento)
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

  async upsertPlano(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = upsertPlanoDietaSchema.parse(request.body)
      const user = request.user!

      const plano = await planoDietaService.upsertPlanoDieta(
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

      const plano = await planoDietaService.getPlanoAtivoByAluno(alunoId, {
        userId: user.id,
        role: user.role,
      })

      if (!plano) {
        return reply.status(404).send({
          error: "Nenhum plano de dieta ativo encontrado",
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

  async getRecomendacao(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = alunoIdParamsSchema.parse(request.params)
      const query = recomendacaoQuerySchema.parse(request.query)
      const user = request.user!

      const recomendacao = await planoDietaService.getRecommendationByAluno(
        { userId: user.id, role: user.role },
        alunoId,
        query.objetivo,
        query.fatorAtividade,
      )

      return reply.send(recomendacao)
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
      const data = startDietaCheckinSchema.parse(request.body)
      const user = request.user!

      const checkin = await planoDietaService.startCheckin(
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

  async updateRefeicaoCheckin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = updateRefeicaoCheckinParamsSchema.parse(request.params)
      const data = updateRefeicaoCheckinBodySchema.parse(request.body)
      const user = request.user!

      const updated = await planoDietaService.updateRefeicaoCheckin(
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
      const params = finalizeDietaCheckinParamsSchema.parse(request.params)
      const data = finalizeDietaCheckinBodySchema.parse(request.body)
      const user = request.user!

      const checkin = await planoDietaService.finalizeCheckin(
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

  async listCheckins(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = alunoIdParamsSchema.parse(request.params)
      const query = listCheckinsQuerySchema.parse(request.query)
      const user = request.user!

      const checkins = await planoDietaService.listCheckinsByAluno(
        { userId: user.id, role: user.role },
        alunoId,
        query.limit ?? 40,
      )

      return reply.send(checkins)
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

  async comentarProfessor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = finalizeDietaCheckinParamsSchema.parse(request.params)
      const data = comentarioProfessorBodySchema.parse(request.body)
      const user = request.user!

      const checkin = await planoDietaService.comentarCheckinComoProfessor(
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
}
