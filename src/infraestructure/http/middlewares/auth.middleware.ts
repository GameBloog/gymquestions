import { FastifyRequest, FastifyReply } from "fastify"
import { JwtHelper } from "../../security/jwt"
import { AppError } from "../../../shared/errors/app-error"

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
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

    request.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }

    return
  } catch (error) {
    throw new AppError("Token inválido ou expirado", 401)
  }
}
