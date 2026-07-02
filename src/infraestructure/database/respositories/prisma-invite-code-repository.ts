import { InviteCodeRepository } from "@/application/repositories/invite-code-repository"
import {
  InviteCode,
  CreateInviteCodeInput,
} from "@/domain/entities/invite-code"
import { prisma } from "../prisma"
import { randomBytes } from "crypto"
import { InviteCodeMapper } from "../mapper/invite-code-mapper"
import { PrismaDatabaseClient } from "../prisma-database-client"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

export class PrismaInviteCodeRepository implements InviteCodeRepository {
  constructor(private readonly database: PrismaDatabaseClient = prisma) {}

  private generateCode(): string {
    const randomPart = randomBytes(4).toString("hex").toUpperCase()
    return `PROF-${new Date().getFullYear()}-${randomPart}`
  }

  async create(data: CreateInviteCodeInput): Promise<InviteCode> {
    const code = this.generateCode()

    const created = await this.database.inviteCode.create({
      data: {
        code,
        role: data.role,
        createdBy: data.createdBy,
        expiresAt: data.expiresAt ?? null,
      },
    })

    return InviteCodeMapper.toDomain(created)
  }

  async findByCode(code: string): Promise<InviteCode | null> {
    const found = await this.database.inviteCode.findUnique({ where: { code } })
    return found ? InviteCodeMapper.toDomain(found) : null
  }

  async markAsUsed(
    code: string,
    userId: string,
    expectedRole: UserRole,
  ): Promise<void> {
    const result = await this.database.inviteCode.updateMany({
      where: {
        code,
        role: expectedRole,
        usedBy: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: {
        usedBy: userId,
        usedAt: new Date(),
      },
    })

    if (result.count !== 1) {
      throw new AppError(
        "Código de convite inválido, expirado ou já utilizado",
        400,
      )
    }
  }

  async findMany(): Promise<InviteCode[]> {
    const codes = await this.database.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
    })

    return codes.map(InviteCodeMapper.toDomain)
  }
}
