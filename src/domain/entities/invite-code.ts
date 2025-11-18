import { UserRole } from "./user"

export interface InviteCode {
  id: string
  code: string
  role: UserRole
  usedBy?: string | null
  usedAt?: Date | null
  expiresAt?: Date | null
  createdBy: string
  createdAt: Date
}

export interface CreateInviteCodeInput {
  role: UserRole
  createdBy: string
  expiresAt?: Date
}
