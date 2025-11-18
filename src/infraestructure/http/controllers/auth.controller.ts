import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { PrismaUserRepository } from "../../database/respositories/prisma-user-repository"
import { RegisterUseCase } from "../../../application/use-cases/auth/register"
import { LoginUseCase } from "../../../application/use-cases/auth/login"
import { registerSchema, loginSchema } from "../validators/auth-validator"
import { GetMeUseCase } from "@/application/use-cases/auth/get-me"

const userRepository = new PrismaUserRepository()

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body)
      const useCase = new RegisterUseCase(userRepository)
      const user = await useCase.execute(data)

      return reply.status(201).send({
        message: "Usuário criado com sucesso",
        user,
      })
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

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body)
      const useCase = new LoginUseCase(userRepository)
      const result = await useCase.execute(data)

      return reply.send(result)
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

  async me(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id
    const useCase = new GetMeUseCase(userRepository)
    const user = await useCase.execute(userId)

    return reply.send(user)
  }
}
