import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { PrismaUserRepository } from "../../database/respositories/prisma-user-repository"
import { PrismaInviteCodeRepository } from "../../database/respositories/prisma-invite-code-repository"
import { PrismaProfessorRepository } from "../../database/respositories/prisma-professor-repository"
import { PrismaAlunoRepository } from "../../database/respositories/prisma-aluno-repository"
import { PrismaLeadAttributionRepository } from "../../database/respositories/prisma-lead-attribution-repository"
import { RegisterUseCase } from "@/application/use-cases/auth/register"
import { LoginUseCase } from "@/application/use-cases/auth/login"
import { GetMeUseCase } from "@/application/use-cases/auth/get-me"
import { CreateInviteCodeUseCase } from "@/application/use-cases/invite-code/create-invite-code"
import { AuthSessionService } from "@/application/use-cases/auth/session"
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "../cookies/refresh-token-cookie"
import {
  registerSchema,
  loginSchema,
  createInviteCodeSchema,
} from "../validators/auth-validator"
import { UserRole } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"

const userRepository = new PrismaUserRepository()
const inviteCodeRepository = new PrismaInviteCodeRepository()
const professorRepository = new PrismaProfessorRepository()
const alunoRepository = new PrismaAlunoRepository()
const leadAttributionRepository = new PrismaLeadAttributionRepository()
const authSessionService = new AuthSessionService()

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body)
      const useCase = new RegisterUseCase(
        userRepository,
        inviteCodeRepository,
        professorRepository,
        alunoRepository,
        leadAttributionRepository,
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
      const refreshToken = await authSessionService.createRefreshSession(
        result.user.id
      )

      setRefreshTokenCookie(reply, refreshToken)
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

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = getRefreshTokenFromRequest(request)

    if (!refreshToken) {
      clearRefreshTokenCookie(reply)
      throw new AppError("Sessão expirada. Faça login novamente.", 401)
    }

    const result = await authSessionService.refreshSession(refreshToken)
    const { refreshToken: nextRefreshToken, ...response } = result

    setRefreshTokenCookie(reply, nextRefreshToken)
    return reply.send(response)
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = getRefreshTokenFromRequest(request)

    if (refreshToken) {
      await authSessionService.revokeRefreshSession(refreshToken)
    }

    clearRefreshTokenCookie(reply)
    return reply.status(204).send()
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
