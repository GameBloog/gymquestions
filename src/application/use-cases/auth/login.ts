import { LoginInput, LoginOutput } from "../../../domain/entities/user"
import { PasswordHelper } from "../../../infraestructure/security/password"
import { AppError } from "../../../shared/errors/app-error"
import { UserRepository } from "../../repositories/user-repository"
import { JwtHelper } from "../../../infraestructure/security/jwt"
import { privacyService } from "../privacy/privacy-service"

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new AppError("Email ou senha incorretos", 401)
    }

    if (user.blockedAt) {
      throw new AppError("Conta bloqueada. Entre em contato com o suporte.", 403)
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
        requiresLegalAcceptance:
          !(await privacyService.hasCurrentAcceptance(user.id)),
      },
    }
  }
}
