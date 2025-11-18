import { CreateUserInput, User } from "../../../domain/entities/user"
import { AppError } from "../../../shared/errors/app-error"
import { UserRepository } from "../../repositories/user-repository"

export class RegisterUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(data: CreateUserInput): Promise<Omit<User, "password">> {
    const userExists = await this.userRepository.findByEmail(data.email)

    if (userExists) {
      throw new AppError("Email já cadastrado", 409)
    }

    const user = await this.userRepository.create(data)

    const { password, ...userWithoutPassword } = user

    return userWithoutPassword
  }
}
