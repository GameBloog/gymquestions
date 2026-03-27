import { sign, verify } from "jsonwebtoken"
import type { SignOptions, VerifyOptions } from "jsonwebtoken"
import { env } from "../../env"
import { UserRole } from "../../domain/entities/user"

export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
}

export class JwtHelper {
  static generate(payload: TokenPayload): string {
    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
      algorithm: "HS256",
    }

    return sign(payload, env.JWT_SECRET, signOptions)
  }

  static verify(token: string): TokenPayload {
    const verifyOptions: VerifyOptions = {
      algorithms: ["HS256"],
    }

    return verify(token, env.JWT_SECRET, verifyOptions) as TokenPayload
  }
}
