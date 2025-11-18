import { InviteCodeRepository } from "@/application/repositories/invite-code-repository"
import { UserRole } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"

export class ValidateInviteCodeUseCase {
  constructor(private inviteCodeRepository: InviteCodeRepository) {}

  async execute(code: string, expectedRole: UserRole): Promise<void> {
    const inviteCode = await this.inviteCodeRepository.findByCode(code)

    if (!inviteCode) {
      throw new AppError("Código de convite inválido", 400)
    }

    if (inviteCode.usedBy) {
      throw new AppError("Código de convite já foi utilizado", 400)
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new AppError("Código de convite expirado", 400)
    }

    if (inviteCode.role !== expectedRole) {
      throw new AppError(
        "Código de convite não é válido para este tipo de usuário",
        400
      )
    }
  }
}
