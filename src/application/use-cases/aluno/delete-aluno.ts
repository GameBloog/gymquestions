import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { AppError } from "@/shared/errors/app-error"
import { privacyService } from "../privacy/privacy-service"

export class DeleteAlunoUseCase {
  constructor(private alunoRepository: AlunoRepository) {}

  async execute(id: string, actorId: string): Promise<void> {
    const aluno = await this.alunoRepository.findById(id)

    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    await privacyService.eraseUser(aluno.userId, actorId)
  }
}
