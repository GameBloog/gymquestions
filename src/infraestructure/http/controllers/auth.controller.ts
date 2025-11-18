import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { PrismaUserRepository } from "../../database/respositories/prisma-user-repository"
import { PrismaInviteCodeRepository } from "../../database/respositories/prisma-invite-code-repository"
import { PrismaProfessorRepository } from "../../database/respositories/prisma-professor-repository"
import { RegisterUseCase } from "@/application/use-cases/auth/register"
import { LoginUseCase } from "@/application/use-cases/auth/login"
import { GetMeUseCase } from "@/application/use-cases/auth/get-me"
import { CreateInviteCodeUseCase } from "@/application/use-cases/invite-code/create-invite-code"
import {
  registerSchema,
  loginSchema,
  createInviteCodeSchema,
} from "../validators/auth-validator"
import { UserRole } from "@/domain/entities/user"

const userRepository = new PrismaUserRepository()
const inviteCodeRepository = new PrismaInviteCodeRepository()
const professorRepository = new PrismaProfessorRepository()

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body)
      const useCase = new RegisterUseCase(
        userRepository,
        inviteCodeRepository,
        professorRepository
      )
      const user = await useCase.execute({
        ...data,
        role: data.role as UserRole,
      })

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

  async createInviteCode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createInviteCodeSchema.parse(request.body)
      const useCase = new CreateInviteCodeUseCase(inviteCodeRepository)

      const inviteCode = await useCase.execute({
        role: data.role as UserRole,
        createdBy: request.user!.id,
        expiresInDays: data.expiresInDays,
      })

      return reply.status(201).send(inviteCode)
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

  async listInviteCodes(request: FastifyRequest, reply: FastifyReply) {
    const codes = await inviteCodeRepository.findMany()
    return reply.send(codes)
  }
}
