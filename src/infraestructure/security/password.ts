import { env } from "../../env"
import { hash, compare } from "bcryptjs"

export class PasswordHelper {
  static async hash(password: string): Promise<string> {
    return await hash(password, env.BCRYPT_ROUNDS)
  }

  static async compare(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await compare(password, hashedPassword)
  }
}
