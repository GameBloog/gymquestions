import { InviteCodeRepository } from "@/application/repositories/invite-code-repository"
import { InviteCode } from "@/domain/entities/invite-code"
import { UserRole } from "@/domain/entities/user"

interface CreateInviteCodeInput {
  role: UserRole
  createdBy: string
  expiresInDays?: number
}

export class CreateInviteCodeUseCase {
  constructor(private inviteCodeRepository: InviteCodeRepository) {}

  async execute(data: CreateInviteCodeInput): Promise<InviteCode> {
    let expiresAt: Date | undefined

    if (data.expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays)
    }

    return await this.inviteCodeRepository.create({
      role: data.role,
      createdBy: data.createdBy,
      expiresAt,
    })
  }
}
