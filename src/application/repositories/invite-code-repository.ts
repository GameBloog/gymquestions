import {
  InviteCode,
  CreateInviteCodeInput,
} from "@/domain/entities/invite-code"
import { UserRole } from "@/domain/entities/user"

export interface InviteCodeRepository {
  create(data: CreateInviteCodeInput): Promise<InviteCode>
  findByCode(code: string): Promise<InviteCode | null>
  markAsUsed(code: string, userId: string, expectedRole: UserRole): Promise<void>
  findMany(): Promise<InviteCode[]>
}
