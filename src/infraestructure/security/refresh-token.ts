import { createHash, randomBytes } from "crypto"
import { env } from "@/env"

export const REFRESH_TOKEN_COOKIE_NAME = "gforce_refresh_token"

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url")
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function getRefreshTokenExpiresAt(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS)
  return expiresAt
}
