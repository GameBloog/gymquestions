import { AccountUnitOfWork } from "@/application/repositories/account-unit-of-work"
import { UserRepository } from "@/application/repositories/user-repository"
import { Professor } from "@/domain/entities/professor"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

interface CreateProfessorInput {
  nome: string
  email: string
  password: string
  telefone?: string
  especialidade?: string
}

export class CreateProfessorUseCase {
  constructor(
    private userRepository: UserRepository,
    private accountUnitOfWork: AccountUnitOfWork,
  ) {}

  async execute(data: CreateProfessorInput): Promise<Professor> {
    const userExists = await this.userRepository.findByEmail(data.email)
    if (userExists) {
      throw new AppError("Email já cadastrado", 409)
    }

    const passwordHash = await this.accountUnitOfWork.preparePassword(
      data.password,
    )

    return this.accountUnitOfWork.execute(async (context) => {
      const user = await context.userRepository.createPrepared({
        nome: data.nome,
        email: data.email,
        passwordHash,
        role: UserRole.PROFESSOR,
      })

      return context.professorRepository.create({
        userId: user.id,
        telefone: data.telefone,
        especialidade: data.especialidade,
      })
    })
  }
}

