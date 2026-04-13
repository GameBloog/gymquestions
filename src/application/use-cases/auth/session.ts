import { prisma } from "@/infraestructure/database/prisma"
import { JwtHelper } from "@/infraestructure/security/jwt"
import {
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
} from "@/infraestructure/security/refresh-token"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

export class AuthSessionService {
  async createRefreshSession(userId: string): Promise<string> {
    const refreshToken = generateRefreshToken()

    await prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: getRefreshTokenExpiresAt(),
      },
    })

    return refreshToken
  }

  async refreshSession(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken)
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AppError("Sessão expirada. Faça login novamente.", 401)
    }

    const nextRefreshToken = generateRefreshToken()
    const nextTokenHash = hashRefreshToken(nextRefreshToken)
    const nextExpiresAt = getRefreshTokenExpiresAt()

    await prisma.$transaction([
      prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: nextTokenHash,
          expiresAt: nextExpiresAt,
        },
      }),
    ])

    const token = JwtHelper.generate({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role as UserRole,
    })

    return {
      token,
      refreshToken: nextRefreshToken,
      user: {
        id: session.user.id,
        nome: session.user.nome,
        email: session.user.email,
        role: session.user.role,
      },
    }
  }

  async revokeRefreshSession(refreshToken: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }
}
