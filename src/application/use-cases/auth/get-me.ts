import { UserRepository } from "@/application/repositories/user-repository"
import { User } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"

export class GetMeUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string): Promise<Omit<User, "password">> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new AppError("Usuário não encontrado", 404)
    }

    const { password, ...userWithoutPassword } = user

    return userWithoutPassword
  }
}
