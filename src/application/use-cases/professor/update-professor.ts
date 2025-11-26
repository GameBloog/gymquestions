import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { Professor, UpdateProfessorInput } from "@/domain/entities/professor"
import { AppError } from "@/shared/errors/app-error"

export class UpdateProfessorUseCase {
  constructor(private professorRepository: ProfessorRepository) {}

  async execute(id: string, data: UpdateProfessorInput): Promise<Professor> {
    const exists = await this.professorRepository.findById(id)

    if (!exists) {
      throw new AppError("Professor não encontrado", 404)
    }

    return await this.professorRepository.update(id, data)
  }
}
