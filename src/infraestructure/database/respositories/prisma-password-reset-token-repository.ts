import type {
  ConsumePasswordResetTokenInput,
  PasswordResetTokenRepository,
  ReplacePasswordResetTokenInput,
} from "@/application/repositories/password-reset-token-repository"
import { PasswordHelper } from "@/infraestructure/security/password"
import { prisma } from "../prisma"

export class PrismaPasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  async replaceActiveToken(
    input: ReplacePasswordResetTokenInput,
  ): Promise<{ id: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.updateMany({
        where: {
          userId: input.userId,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      })

      return transaction.passwordResetToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
        select: { id: true },
      })
    })
  }

  async deleteById(id: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({ where: { id } })
  }

  async consumeAndResetPassword(
    input: ConsumePasswordResetTokenInput,
  ): Promise<boolean> {
    const passwordHash = await PasswordHelper.hash(input.newPassword)
    const now = new Date()

    return prisma.$transaction(async (transaction) => {
      const token = await transaction.passwordResetToken.findUnique({
        where: { tokenHash: input.tokenHash },
        select: { id: true, userId: true, usedAt: true, expiresAt: true },
      })

      if (!token || token.usedAt || token.expiresAt <= now) {
        return false
      }

      const claimed = await transaction.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      })

      if (claimed.count !== 1) {
        return false
      }

      await transaction.user.update({
        where: { id: token.userId },
        data: { password: passwordHash },
      })

      await transaction.refreshSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      })

      await transaction.passwordResetToken.updateMany({
        where: { userId: token.userId, usedAt: null },
        data: { usedAt: now },
      })

      return true
    })
  }
}
