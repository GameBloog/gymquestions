import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { Aluno } from "@/domain/entities/aluno"
import { AppError } from "@/shared/errors/app-error"

export class GetAlunoByIdUseCase {
  constructor(private alunoRepository: AlunoRepository) {}

  async execute(id: string): Promise<Aluno> {
    const aluno = await this.alunoRepository.findById(id)

    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    return aluno
  }
}
