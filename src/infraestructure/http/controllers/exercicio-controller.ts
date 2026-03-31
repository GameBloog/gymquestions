import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { ExercicioService } from "@/application/use-cases/exercicio/exercicio-service"
import { AppError } from "@/shared/errors/app-error"
import { env } from "@/env"
import {
  createExercicioSchema,
  exercicioMediaParamsSchema,
  importExercicioExternoSchema,
  listExerciciosQuerySchema,
  searchExercicioExternoSchema,
  grupamentosMusculares,
} from "../validators/exercicio-validator"

const exercicioService = new ExercicioService()

export class ExercicioController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = listExerciciosQuerySchema.parse(request.query)
      const user = request.user!

      const exercicios = await exercicioService.listExercicios(
        { userId: user.id, role: user.role },
        {
          q: query.q,
          grupamento: query.grupamento,
        },
      )

      return reply.send(exercicios)
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

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createExercicioSchema.parse(request.body)
      const user = request.user!

      const exercicio = await exercicioService.createProfessorExercicio(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(exercicio)
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

  async searchExternal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = searchExercicioExternoSchema.parse(request.query)
      const resultados = await exercicioService.searchExternalExercicios(
        query.q,
        query.limit ?? 20,
      )

      return reply.send(resultados)
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

  async importExternal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = importExercicioExternoSchema.parse(request.body)
      const user = request.user!

      const exercicio = await exercicioService.importExternalExercicio(
        { userId: user.id, role: user.role },
        data,
      )

      return reply.status(201).send(exercicio)
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

  async uploadMedia(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = exercicioMediaParamsSchema.parse(request.params)
      const user = request.user!
      const data = await request.file()

      if (!data) {
        throw new AppError("Nenhum arquivo foi enviado", 400)
      }

      const buffer = await data.toBuffer()

      if (buffer.length > env.MAX_FILE_SIZE) {
        throw new AppError(
          `Arquivo muito grande. Máximo: ${env.MAX_FILE_SIZE / 1024 / 1024}MB`,
          400,
        )
      }

      const exercicio = await exercicioService.uploadExerciseMedia(
        { userId: user.id, role: user.role },
        {
          exercicioId: params.exercicioId,
          kind: params.kind,
          buffer,
          mimetype: data.mimetype,
        },
      )

      return reply.send(exercicio)
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

  async clearMedia(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = exercicioMediaParamsSchema.parse(request.params)
      const user = request.user!

      const exercicio = await exercicioService.clearExerciseMedia(
        { userId: user.id, role: user.role },
        {
          exercicioId: params.exercicioId,
          kind: params.kind,
        },
      )

      return reply.send(exercicio)
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

  async listGrupamentos(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(grupamentosMusculares)
  }
}
