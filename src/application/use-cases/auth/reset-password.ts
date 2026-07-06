import type { PasswordResetTokenRepository } from "@/application/repositories/password-reset-token-repository"
import { hashPasswordResetToken } from "@/infraestructure/security/password-reset-token"
import { AppError } from "@/shared/errors/app-error"

interface ResetPasswordInput {
  token: string
  newPassword: string
}

export class ResetPasswordUseCase {
  constructor(
    private passwordResetTokenRepository: PasswordResetTokenRepository,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const reset =
      await this.passwordResetTokenRepository.consumeAndResetPassword({
        tokenHash: hashPasswordResetToken(input.token),
        newPassword: input.newPassword,
      })

    if (!reset) {
      throw new AppError(
        "Link de recuperação inválido, expirado ou já utilizado",
        400,
      )
    }
  }
}
