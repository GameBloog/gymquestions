import { createHash, randomBytes } from "crypto"

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function getPasswordResetExpiresAt(
  expiresInMinutes: number,
  now = new Date(),
): Date {
  return new Date(now.getTime() + expiresInMinutes * 60 * 1000)
}
