import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { AccountUnitOfWork } from "@/application/repositories/account-unit-of-work"
import { TransactionalUserRepository } from "@/application/repositories/user-repository"
import { Professor, UpdateProfessorInput } from "@/domain/entities/professor"
import { UpdateUserInput } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"

interface UpdateProfessorUseCaseInput extends UpdateProfessorInput {
  nome?: string
  email?: string
  password?: string
}

export class UpdateProfessorUseCase {
  constructor(
    private professorRepository: ProfessorRepository,
    private accountUnitOfWork: AccountUnitOfWork,
  ) {}

  async execute(
    id: string,
    data: UpdateProfessorUseCaseInput,
  ): Promise<Professor> {
    const exists = await this.professorRepository.findById(id)

    if (!exists) {
      throw new AppError("Professor não encontrado", 404)
    }

    const passwordHash = data.password !== undefined
      ? await this.accountUnitOfWork.preparePassword(data.password)
      : undefined

    return this.accountUnitOfWork.execute(async (context) => {
      await this.updateLinkedUserIfNeeded(
        exists.userId,
        data,
        context.userRepository,
        passwordHash,
      )

      const professorData = this.extractProfessorData(data)

      if (Object.keys(professorData).length === 0) {
        return (await context.professorRepository.findById(id)) ?? exists
      }

      return context.professorRepository.update(id, professorData)
    })
  }

  private async updateLinkedUserIfNeeded(
    userId: string,
    data: UpdateProfessorUseCaseInput,
    userRepository: TransactionalUserRepository,
    passwordHash?: string,
  ) {
    const userData = this.extractUserData(data)

    if (Object.keys(userData).length === 0 && !passwordHash) {
      return
    }

    const currentUser = await userRepository.findById(userId)

    if (!currentUser) {
      throw new AppError("Usuário não encontrado", 404)
    }

    if (userData.email && userData.email !== currentUser.email) {
      const existingUser = await userRepository.findByEmail(userData.email)

      if (existingUser && existingUser.id !== currentUser.id) {
        throw new AppError("Email já cadastrado", 409)
      }
    }

    await userRepository.updatePrepared(userId, {
      ...userData,
      ...(passwordHash !== undefined && { passwordHash }),
    })
  }

  private extractProfessorData(
    data: UpdateProfessorUseCaseInput,
  ): UpdateProfessorInput {
    return {
      ...(data.telefone !== undefined && { telefone: data.telefone }),
      ...(data.especialidade !== undefined && {
        especialidade: data.especialidade,
      }),
    }
  }

  private extractUserData(data: UpdateProfessorUseCaseInput): Omit<UpdateUserInput, "password"> {
    return {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
    }
  }
}
