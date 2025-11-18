import {
  InviteCode,
  CreateInviteCodeInput,
} from "@/domain/entities/invite-code"

export interface InviteCodeRepository {
  create(data: CreateInviteCodeInput): Promise<InviteCode>
  findByCode(code: string): Promise<InviteCode | null>
  markAsUsed(code: string, userId: string): Promise<void>
  findMany(): Promise<InviteCode[]>
}
