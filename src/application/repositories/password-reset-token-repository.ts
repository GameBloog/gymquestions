export interface ReplacePasswordResetTokenInput {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface ConsumePasswordResetTokenInput {
  tokenHash: string
  newPassword: string
}

export interface PasswordResetTokenRepository {
  replaceActiveToken(
    input: ReplacePasswordResetTokenInput,
  ): Promise<{ id: string }>
  deleteById(id: string): Promise<void>
  consumeAndResetPassword(
    input: ConsumePasswordResetTokenInput,
  ): Promise<boolean>
}
