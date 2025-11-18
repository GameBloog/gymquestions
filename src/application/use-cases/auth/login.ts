import { LoginInput, LoginOutput } from "../../../domain/entities/user"
import { PasswordHelper } from "../../../infraestructure/security/password"
import { AppError } from "../../../shared/errors/app-error"
import { UserRepository } from "../../repositories/user-repository"
import { JwtHelper } from "../../../infraestructure/security/jwt"

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new AppError("Email ou senha incorretos", 401)
    }

    const passwordMatch = await PasswordHelper.compare(password, user.password)

    if (!passwordMatch) {
      throw new AppError("Email ou senha incorretos", 401)
    }

    const token = JwtHelper.generate({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    }
  }
}
