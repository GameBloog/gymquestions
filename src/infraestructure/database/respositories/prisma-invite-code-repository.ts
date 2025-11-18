import { InviteCodeRepository } from "@/application/repositories/invite-code-repository"
import {
  InviteCode,
  CreateInviteCodeInput,
} from "@/domain/entities/invite-code"
import { prisma } from "../prisma"
import { randomBytes } from "crypto"
import { InviteCodeMapper } from "../mapper/invite-code-mapper"

export class PrismaInviteCodeRepository implements InviteCodeRepository {
  private generateCode(): string {
    const randomPart = randomBytes(4).toString("hex").toUpperCase()
    return `PROF-${new Date().getFullYear()}-${randomPart}`
  }

  async create(data: CreateInviteCodeInput): Promise<InviteCode> {
    const code = this.generateCode()

    const created = await prisma.inviteCode.create({
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
    const found = await prisma.inviteCode.findUnique({ where: { code } })
    return found ? InviteCodeMapper.toDomain(found) : null
  }

  async markAsUsed(code: string, userId: string): Promise<void> {
    await prisma.inviteCode.update({
      where: { code },
      data: {
        usedBy: userId,
        usedAt: new Date(),
      },
    })
  }

  async findMany(): Promise<InviteCode[]> {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
    })

    return codes.map(InviteCodeMapper.toDomain)
  }
}
