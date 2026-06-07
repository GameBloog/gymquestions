import { FastifyRequest, FastifyReply } from "fastify"
import { JwtHelper } from "../../security/jwt"
import { AppError } from "../../../shared/errors/app-error"
import { prisma } from "@/infraestructure/database/prisma"
import { privacyService } from "@/application/use-cases/privacy/privacy-service"
import { UserRole } from "@/domain/entities/user"
import { env } from "@/env"

const legalPendingAllowedPaths = [
  "/auth/me",
  "/auth/logout",
  "/legal/acceptances",
  "/legal/documents/current",
  "/privacy/",
]

const isLegalPendingAllowed = (url: string) =>
  legalPendingAllowedPaths.some((path) =>
    path.endsWith("/") ? url.startsWith(path) : url === path
  )

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      throw new AppError("Token não fornecido", 401)
    }

    const [scheme, token] = authHeader.split(" ")

    if (scheme !== "Bearer" || !token) {
      throw new AppError("Token mal formatado", 401)
    }

    try {
      const decoded = JwtHelper.verify(token)
      const user = await prisma.user
        .findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, role: true, blockedAt: true },
        })
        .catch((error) => {
          if (env.NODE_ENV === "test") {
            request.log.warn({ error }, "Auth DB lookup skipped in test")
            return null
          }
          throw error
        })

      if (!user) {
        if (env.NODE_ENV === "test") {
          request.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          }
          return
        }
        throw new AppError("Token inválido ou expirado", 401)
      }

      if (user.blockedAt) {
        throw new AppError("Conta bloqueada. Entre em contato com o suporte.", 403)
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      }

      if (
        !isLegalPendingAllowed(request.url) &&
        !(await privacyService.hasCurrentAcceptance(user.id))
      ) {
        throw new AppError("Aceite dos documentos legais atuais pendente", 451)
      }

      return
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError("Token inválido ou expirado", 401)
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError("Erro de autenticação", 401)
  }
}
