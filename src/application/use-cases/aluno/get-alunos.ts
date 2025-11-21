import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { Aluno } from "@/domain/entities/aluno"

export class GetAlunosUseCase {
  constructor(private alunoRepository: AlunoRepository) {}

  async execute(): Promise<Aluno[]> {
    return await this.alunoRepository.findMany()
  }

  async executeByProfessor(professorId: string): Promise<Aluno[]> {
    return await this.alunoRepository.findManyByProfessor(professorId)
  }
}
