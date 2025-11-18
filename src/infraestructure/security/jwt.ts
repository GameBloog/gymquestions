import { sign, verify } from "jsonwebtoken"
import { env } from "../../env"
import { UserRole } from "../../domain/entities/user"

export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
}

export class JwtHelper {
  static generate(payload: TokenPayload): string {
    return sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as import("jsonwebtoken").SignOptions)
  }

  static verify(token: string): TokenPayload {
    return verify(token, env.JWT_SECRET) as TokenPayload
  }
}
