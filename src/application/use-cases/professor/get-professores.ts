import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { Professor } from "@/domain/entities/professor"

export class GetProfessoresUseCase {
  constructor(private professorRepository: ProfessorRepository) {}

  async execute(): Promise<Professor[]> {
    return await this.professorRepository.findMany()
  }
}
