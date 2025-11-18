import { FastifyRequest, FastifyReply } from "fastify"
import { UserRole } from "../../../domain/entities/user"
import { AppError } from "../../../shared/errors/app-error"

export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user

    if (!user) {
      throw new AppError("Usuário não autenticado", 401)
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(
        "Você não tem permissão para acessar este recurso",
        403
      )
    }

    return
  }
}
