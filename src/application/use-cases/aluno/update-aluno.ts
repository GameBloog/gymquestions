import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { Aluno, UpdateAlunoInput } from "@/domain/entities/aluno"
import { AppError } from "@/shared/errors/app-error"

export class UpdateAlunoUseCase {
  constructor(private alunoRepository: AlunoRepository) {}

  async execute(id: string, data: UpdateAlunoInput): Promise<Aluno> {
    const exists = await this.alunoRepository.findById(id)

    if (!exists) {
      throw new AppError("Aluno não encontrado", 404)
    }

    return await this.alunoRepository.update(id, data)
  }
}
