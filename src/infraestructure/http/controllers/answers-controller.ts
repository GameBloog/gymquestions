import { FastifyReply, FastifyRequest } from "fastify"
import { PrismaUserAnswerRepository } from "../../database/respositories/prisma-user-answer-repository"
import {
  createAnswerSchema,
  getAnswerByIdSchema,
  updateAnswerSchema,
} from "../validators/answer-validator"
import { CreateAnswerUseCase } from "../../../application/use-cases/create-asnwer"
import z, { ZodError } from "zod"
import { GetAnswerUseCase } from "../../../application/use-cases/get-answers"
import { GetAnswerByIdUseCase } from "../../../application/use-cases/get-answers-by.id"
import { UpdateAnswerUseCase } from "../../../application/use-cases/update-answer"
import { DeleteAnswerUseCase } from "../../../application/use-cases/delete-answer"

const repository = new PrismaUserAnswerRepository()

export class AnswerController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createAnswerSchema.parse(request.body)
      const useCase = new CreateAnswerUseCase(repository)
      const answer = await useCase.execute(data)

      return reply.status(201).send(answer)
    } catch (error) {
      if (error instanceof ZodError) {
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

  async list(request: FastifyRequest, reply: FastifyReply) {
    const useCase = new GetAnswerUseCase(repository)
    const answers = await useCase.execute()
    return reply.send(answers)
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getAnswerByIdSchema.parse(request.params)
      const useCase = new GetAnswerByIdUseCase(repository)
      const answer = await useCase.execute(id)

      return reply.send(answer)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: "Id Invalido",
          details: error.message,
        })
      }
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getAnswerByIdSchema.parse(request.params)
      const data = updateAnswerSchema.parse(request.body)

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({
          error: "Nenhum campo foi enviado para atualização",
        })
      }

      const useCase = new UpdateAnswerUseCase(repository)
      const answer = await useCase.execute(id, data)

      return reply.send(answer)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues.map((e) => ({
            campo: e.path.join("."),
            mensagem: e.message,
          })),
        })
      }
      throw error
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getAnswerByIdSchema.parse(request.params)
      const useCase = new DeleteAnswerUseCase(repository)
      await useCase.execute(id)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "ID inválido",
          details: error.message,
        })
      }
      throw error
    }
  }
}
