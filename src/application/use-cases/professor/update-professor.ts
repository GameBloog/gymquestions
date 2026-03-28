import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { UserRepository } from "@/application/repositories/user-repository"
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
    private userRepository: UserRepository,
  ) {}

  async execute(
    id: string,
    data: UpdateProfessorUseCaseInput,
  ): Promise<Professor> {
    const exists = await this.professorRepository.findById(id)

    if (!exists) {
      throw new AppError("Professor não encontrado", 404)
    }

    await this.updateLinkedUserIfNeeded(exists.userId, data)

    const professorData = this.extractProfessorData(data)

    if (Object.keys(professorData).length === 0) {
      return exists
    }

    return await this.professorRepository.update(id, professorData)
  }

  private async updateLinkedUserIfNeeded(
    userId: string,
    data: UpdateProfessorUseCaseInput,
  ) {
    const userData = this.extractUserData(data)

    if (Object.keys(userData).length === 0) {
      return
    }

    const currentUser = await this.userRepository.findById(userId)

    if (!currentUser) {
      throw new AppError("Usuário não encontrado", 404)
    }

    if (userData.email && userData.email !== currentUser.email) {
      const existingUser = await this.userRepository.findByEmail(userData.email)

      if (existingUser && existingUser.id !== currentUser.id) {
        throw new AppError("Email já cadastrado", 409)
      }
    }

    await this.userRepository.update(userId, userData)
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

  private extractUserData(data: UpdateProfessorUseCaseInput): UpdateUserInput {
    return {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.password !== undefined && { password: data.password }),
    }
  }
}
