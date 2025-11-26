import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { Professor } from "@/domain/entities/professor"
import { AppError } from "@/shared/errors/app-error"

export class GetProfessorByIdUseCase {
  constructor(private professorRepository: ProfessorRepository) {}

  async execute(id: string): Promise<Professor> {
    const professor = await this.professorRepository.findById(id)

    if (!professor) {
      throw new AppError("Professor não encontrado", 404)
    }

    return professor
  }
}
