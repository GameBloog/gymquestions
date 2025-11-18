import { InviteCode } from "@/domain/entities/invite-code"
import { UserRole } from "@/domain/entities/user"
import { InviteCode as PrismaInviteCode, Prisma } from "@prisma/client"

export class InviteCodeMapper {
  static toDomain(raw: PrismaInviteCode): InviteCode {
    return {
      id: raw.id,
      code: raw.code,
      role: raw.role as UserRole,
      usedBy: raw.usedBy,
      usedAt: raw.usedAt,
      expiresAt: raw.expiresAt,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
    }
  }
}
