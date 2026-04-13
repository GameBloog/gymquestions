import { FastifyReply, FastifyRequest } from "fastify"
import { env } from "@/env"
import { REFRESH_TOKEN_COOKIE_NAME } from "@/infraestructure/security/refresh-token"

function buildRefreshTokenCookie(value: string, maxAgeSeconds: number): string {
  const sameSite = env.NODE_ENV === "production" ? "None" : "Lax"
  const secure = env.NODE_ENV === "production" ? "; Secure" : ""

  return [
    `${REFRESH_TOKEN_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/auth",
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=${sameSite}${secure}`,
  ].join("; ")
}

export function setRefreshTokenCookie(reply: FastifyReply, token: string) {
  const maxAgeSeconds = env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60
  reply.header("Set-Cookie", buildRefreshTokenCookie(token, maxAgeSeconds))
}

export function clearRefreshTokenCookie(reply: FastifyReply) {
  reply.header("Set-Cookie", buildRefreshTokenCookie("", 0))
}

export function getRefreshTokenFromRequest(
  request: FastifyRequest,
): string | null {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim())
  const refreshCookie = cookies.find((cookie) =>
    cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`)
  )

  if (!refreshCookie) return null

  const [, rawValue = ""] = refreshCookie.split("=")
  return rawValue ? decodeURIComponent(rawValue) : null
}
