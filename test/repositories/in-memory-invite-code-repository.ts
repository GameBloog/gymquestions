import { InviteCodeRepository } from "../../src/application/repositories/invite-code-repository"
import {
  InviteCode,
  CreateInviteCodeInput,
} from "../../src/domain/entities/invite-code"
import { randomUUID } from "crypto"

export class InMemoryInviteCodeRepository implements InviteCodeRepository {
  public inviteCodes: InviteCode[] = []

  async create(data: CreateInviteCodeInput): Promise<InviteCode> {
    const code = this.generateCode()

    const inviteCode: InviteCode = {
      id: randomUUID(),
      code,
      role: data.role,
      usedBy: null,
      usedAt: null,
      expiresAt: data.expiresAt || null,
      createdBy: data.createdBy,
      createdAt: new Date(),
    }

    this.inviteCodes.push(inviteCode)
    return inviteCode
  }

  async findByCode(code: string): Promise<InviteCode | null> {
    const inviteCode = this.inviteCodes.find((ic) => ic.code === code)
    return inviteCode || null
  }

  async markAsUsed(code: string, userId: string): Promise<void> {
    const inviteCode = this.inviteCodes.find((ic) => ic.code === code)

    if (inviteCode) {
      inviteCode.usedBy = userId
      inviteCode.usedAt = new Date()
    }
  }

  async findMany(): Promise<InviteCode[]> {
    return this.inviteCodes
  }

  // Método auxiliar privado
  private generateCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase()
    return `PROF-${new Date().getFullYear()}-${randomPart}`
  }

  // Métodos auxiliares para testes
  clear() {
    this.inviteCodes = []
  }

  count(): number {
    return this.inviteCodes.length
  }
}
