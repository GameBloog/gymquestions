import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { UserRepository } from "@/application/repositories/user-repository"
import { AppError } from "@/shared/errors/app-error"

export class DeleteAlunoUseCase {
  constructor(
    private alunoRepository: AlunoRepository,
    private userRepository: UserRepository
  ) {}

  async execute(id: string): Promise<void> {
    const aluno = await this.alunoRepository.findById(id)

    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    await this.alunoRepository.delete(id)
  }
}
